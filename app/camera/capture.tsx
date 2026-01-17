import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, SafeAreaView, ScrollView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Camera, Upload, X, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LoadingScreen } from '../../components/LoadingScreen';
import { scanReceipt } from '../../utils/gemini';
import { useAuth } from '../../context/AuthContext';
import { getInitials, getNextColor } from '../../types';

export default function CaptureScreen() {
    const router = useRouter();
    const { user, session, profile } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Request permission on mount
    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleCapture = async () => {
        if (!cameraRef.current) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: true,
            });

            if (photo?.uri) {
                setCapturedImage(photo.uri);
            }
        } catch (error) {
            console.error('Error capturing photo:', error);
            Alert.alert('Error', 'Failed to capture photo');
        }
    };

    const handlePickImage = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setCapturedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleAnalyze = async () => {
        if (!capturedImage) return;

        setIsAnalyzing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            console.log('CaptureScreen: Starting receipt analysis...');
            const result = await scanReceipt(capturedImage);
            console.log('CaptureScreen: Analysis result received:', result);

            // Validate we have the data we need
            if (!result || !result.items || result.items.length === 0) {
                console.error('CaptureScreen: Invalid result - no items');
                Alert.alert('Error', 'Could not parse receipt. Please try again.');
                setIsAnalyzing(false);
                return;
            }

            // Create bill in Supabase
            if (!user || !session) {
                Alert.alert('Error', 'Please log in to create a bill.');
                setIsAnalyzing(false);
                return;
            }

            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Calculate subtotal from items
            const subtotal = result.items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);

            // Create the bill
            const billResponse = await fetch(
                `${supabaseUrl}/rest/v1/bills`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify({
                        host_id: user.id,
                        total_amount: subtotal,
                        status: 'active',
                        details: {
                            items: result.items,
                            scannedTip: result.scannedTip || 0,
                        }
                    }),
                }
            );

            if (!billResponse.ok) {
                throw new Error('Failed to create bill');
            }

            const billData = await billResponse.json();
            const billId = billData[0].id;
            console.log('CaptureScreen: Created bill with id:', billId);

            // Add host as first participant
            const displayName = profile?.username || user.email?.split('@')[0] || 'You';

            await fetch(
                `${supabaseUrl}/rest/v1/bill_participants`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({
                        bill_id: billId,
                        user_id: user.id,
                        name: displayName,
                        is_guest: false,
                        color: getNextColor(0), // First color for host
                        initials: getInitials(displayName),
                    }),
                }
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to Party Screen instead of setup
            router.push({
                pathname: '/bill/party',
                params: {
                    id: billId,
                    billData: JSON.stringify(result),
                }
            });
        } catch (error: any) {
            console.error('CaptureScreen: Analysis error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Analysis Failed', error.message || 'Could not analyze receipt');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClearImage = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCapturedImage(null);
    };

    if (isAnalyzing) {
        return <LoadingScreen />;
    }

    // Show captured image preview
    if (capturedImage) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
                    <TouchableOpacity
                        onPress={handleClearImage}
                        style={{
                            padding: 12,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 12,
                        }}
                    >
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </View>

                {/* Preview */}
                <View style={{ flex: 1, padding: 16 }}>
                    <Image
                        source={{ uri: capturedImage }}
                        style={{ flex: 1, borderRadius: 16 }}
                        resizeMode="contain"
                    />
                </View>

                {/* Analyze Button */}
                <View style={{ padding: 20 }}>
                    <TouchableOpacity
                        onPress={handleAnalyze}
                        style={{
                            backgroundColor: '#B54CFF',
                            paddingVertical: 18,
                            borderRadius: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Zap color="white" size={24} style={{ marginRight: 8 }} />
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                            Analyze Receipt
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Camera permission not granted
    if (!permission?.granted) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Stack.Screen options={{ headerShown: false }} />
                <Camera color="#B54CFF" size={64} />
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center', color: '#111827' }}>
                    Camera Permission Required
                </Text>
                <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
                    We need camera access to scan your receipts.
                </Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    style={{
                        backgroundColor: '#B54CFF',
                        paddingVertical: 14,
                        paddingHorizontal: 32,
                        borderRadius: 12,
                    }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                        Grant Permission
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 16 }}
                >
                    <Text style={{ color: '#6B7280' }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Camera view
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, zIndex: 10 }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        padding: 12,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 12,
                    }}
                >
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handlePickImage}
                    style={{
                        padding: 12,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 12,
                    }}
                >
                    <Upload color="white" size={24} />
                </TouchableOpacity>
            </View>

            {/* Camera */}
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
            >
                {/* Viewfinder overlay */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View
                        style={{
                            width: '85%',
                            height: '60%',
                            borderWidth: 2,
                            borderColor: 'rgba(255,255,255,0.5)',
                            borderRadius: 16,
                            borderStyle: 'dashed',
                        }}
                    />
                    <Text style={{ color: 'white', marginTop: 16, opacity: 0.7 }}>
                        Position receipt within frame
                    </Text>
                </View>
            </CameraView>

            {/* Capture Button */}
            <View style={{ padding: 20, alignItems: 'center' }}>
                <TouchableOpacity
                    onPress={handleCapture}
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: '#B54CFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 4,
                        borderColor: 'rgba(255,255,255,0.5)',
                    }}
                >
                    <Camera color="white" size={32} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

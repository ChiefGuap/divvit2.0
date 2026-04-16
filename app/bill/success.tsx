import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, PartyPopper, Camera, Users, PlusCircle, CheckCircle } from 'lucide-react-native';
import { uploadBillPhoto } from '../../utils/photoUpload';

export default function SuccessScreen() {
    const router = useRouter();
    const { billId, totalAmount, groupSize } = useLocalSearchParams<{
        billId: string;
        totalAmount: string;
        groupSize: string;
    }>();

    const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);

    // TODO: Calculate real points from Supabase rewards system
    const points = 125;

    const handleTakePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Camera access is required to take a group photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setGroupPhoto(uri);
            setIsUploading(true);
            try {
                await uploadBillPhoto(billId, uri);
                setUploadComplete(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    'Photo saved!',
                    'Great shot! +5 bonus points added.',
                    [{ text: 'Awesome!' }]
                );
            } catch (err: any) {
                console.error('Photo upload failed:', err);
                Alert.alert(
                    'Upload Failed',
                    'Could not save the photo. Please try again.',
                    [{ text: 'OK' }]
                );
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(tabs)/');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#faf4ff' }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            >
                {/* Header */}
                <Text style={{
                    fontSize: 20, fontWeight: '900', color: '#4142e3',
                    letterSpacing: -0.5, paddingTop: 8, paddingBottom: 8,
                }}>
                    Divvit
                </Text>

                {/* Hero Section */}
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                    {/* Ambient glow */}
                    <View style={{
                        position: 'absolute', width: 200, height: 200,
                        borderRadius: 100, backgroundColor: 'rgba(65,66,227,0.1)',
                        opacity: 0.5, transform: [{ scale: 1.3 }],
                    }} />

                    {/* Main icon circle */}
                    <LinearGradient
                        colors={['#4142e3', '#3432d7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            width: 120, height: 120, borderRadius: 60,
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#4142e3',
                            shadowOffset: { width: 0, height: 12 },
                            shadowOpacity: 0.3,
                            shadowRadius: 30,
                            elevation: 8,
                        }}
                    >
                        <FileText size={56} color="#ffffff" />
                    </LinearGradient>

                    {/* Floating decoration */}
                    <View style={{
                        position: 'absolute', top: 8, right: 40,
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                        alignItems: 'center', justifyContent: 'center',
                        transform: [{ rotate: '12deg' }],
                    }}>
                        <PartyPopper size={20} color="#4142e3" />
                    </View>
                </View>

                {/* Headline */}
                <Text style={{
                    fontSize: 26, fontWeight: '900', color: '#302950',
                    letterSpacing: -0.5, textAlign: 'center', marginTop: 28,
                }}>
                    Bill has been split
                </Text>

                {/* Points Card */}
                <View style={{
                    backgroundColor: '#ffffff', borderRadius: 999,
                    paddingVertical: 32, paddingHorizontal: 32,
                    marginTop: 20, alignItems: 'center',
                    overflow: 'hidden',
                    shadowColor: '#302950',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 24,
                    elevation: 2,
                }}>
                    {/* Decorative blur */}
                    <View style={{
                        position: 'absolute', top: -40, right: -40,
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: 'rgba(150,55,118,0.1)',
                        opacity: 0.8,
                    }} />

                    <Text style={{
                        fontSize: 11, fontWeight: '800', color: '#79719d',
                        letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8,
                    }}>
                        Earnings
                    </Text>

                    <View style={{
                        flexDirection: 'row', alignItems: 'flex-end',
                        justifyContent: 'center', gap: 6,
                    }}>
                        <Text style={{
                            fontSize: 56, fontWeight: '900', color: '#4142e3',
                            letterSpacing: -2, lineHeight: 56,
                        }}>
                            {points}
                        </Text>
                        <Text style={{
                            fontSize: 22, fontWeight: '900', color: '#3432d7',
                            marginBottom: 6,
                        }}>
                            pts
                        </Text>
                    </View>

                    <Text style={{
                        fontSize: 14, color: '#5e5680', fontWeight: '500',
                        marginTop: 8, textAlign: 'center',
                    }}>
                        You earned {points} pts through this split
                    </Text>
                </View>

                {/* Take Group Picture Button */}
                <TouchableOpacity
                    onPress={handleTakePhoto}
                    disabled={isUploading || uploadComplete}
                    activeOpacity={0.85}
                    style={{
                        marginTop: 28, height: 60, borderRadius: 999,
                        backgroundColor: uploadComplete ? '#16a34a' : '#4142e3',
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'center', gap: 12,
                        shadowColor: uploadComplete ? '#16a34a' : '#4142e3',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.3,
                        shadowRadius: 30,
                        elevation: 8,
                        opacity: isUploading ? 0.8 : 1,
                    }}
                >
                    {isUploading ? (
                        <>
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '900' }}>
                                Uploading...
                            </Text>
                        </>
                    ) : uploadComplete ? (
                        <>
                            <CheckCircle size={24} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '900' }}>
                                Photo saved!
                            </Text>
                        </>
                    ) : (
                        <>
                            <Camera size={24} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '900' }}>
                                Take a group picture
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Group Photo Preview */}
                {groupPhoto && (
                    <View style={{ marginTop: 20, borderRadius: 20, overflow: 'hidden' }}>
                        <Image
                            source={{ uri: groupPhoto }}
                            style={{
                                width: '100%', height: 200,
                                borderRadius: 20,
                            }}
                            resizeMode="cover"
                        />
                    </View>
                )}

                {/* Bonus Hint */}
                {!uploadComplete && (
                    <View style={{
                        marginTop: 10, flexDirection: 'row',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                        <PlusCircle size={16} color="#5e5680" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#5e5680' }}>
                            Earn +5pts by taking a photo
                        </Text>
                    </View>
                )}

                {/* Stats Bento Row */}
                <View style={{ marginTop: 28, flexDirection: 'row', gap: 12 }}>
                    <View style={{
                        flex: 1, backgroundColor: '#f4eeff',
                        borderRadius: 24, padding: 20,
                    }}>
                        <Users size={24} color="#4142e3" style={{ marginBottom: 8 }} />
                        <Text style={{
                            fontSize: 10, fontWeight: '800', color: '#79719d',
                            letterSpacing: 2, textTransform: 'uppercase',
                        }}>
                            Group Size
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#302950' }}>
                            {groupSize || '0'} People
                        </Text>
                    </View>
                    <View style={{
                        flex: 1, backgroundColor: '#f4eeff',
                        borderRadius: 24, padding: 20,
                    }}>
                        <FileText size={24} color="#5e4ab3" style={{ marginBottom: 8 }} />
                        <Text style={{
                            fontSize: 10, fontWeight: '800', color: '#79719d',
                            letterSpacing: 2, textTransform: 'uppercase',
                        }}>
                            Total Bill
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#302950' }}>
                            ${totalAmount || '0.00'}
                        </Text>
                    </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                    onPress={handleClose}
                    activeOpacity={0.85}
                    style={{
                        marginTop: 20, height: 58, borderRadius: 999,
                        backgroundColor: 'transparent',
                        borderWidth: 2, borderColor: '#4142e3',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Text style={{ color: '#4142e3', fontSize: 17, fontWeight: '900' }}>
                        Close the split
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

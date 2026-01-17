import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    Share,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { ArrowLeft, Plus, QrCode, Share2, Users, UserPlus, X, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { Participant, getInitials, getNextColor } from '../../types';
import '../../global.css';

export default function PartyScreen() {
    const router = useRouter();
    const { id: billId, billData } = useLocalSearchParams<{ id: string; billData?: string }>();
    const { user, session, profile } = useAuth();

    // State
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [billStatus, setBillStatus] = useState<'active' | 'started'>('active');
    const [hostId, setHostId] = useState<string | null>(null);

    const isHost = user?.id === hostId;
    const deepLinkUrl = Linking.createURL(`/bill/${billId}`);
    console.log('Generated Join Link:', deepLinkUrl); // For debugging

    // Fetch bill info and participants
    useEffect(() => {
        if (!billId || !session) return;
        fetchBillAndParticipants();

        // Set up realtime subscription
        const subscription = setupRealtimeSubscription();

        return () => {
            subscription?.unsubscribe();
        };
    }, [billId, session]);

    const fetchBillAndParticipants = async () => {
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Fetch bill to get host_id and status
            const billResponse = await fetch(
                `${supabaseUrl}/rest/v1/bills?id=eq.${billId}&select=*`,
                {
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session!.access_token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (billResponse.ok) {
                const billData = await billResponse.json();
                if (billData && billData.length > 0) {
                    setHostId(billData[0].host_id);
                    setBillStatus(billData[0].status === 'started' ? 'started' : 'active');
                }
            }

            // Fetch participants
            const participantsResponse = await fetch(
                `${supabaseUrl}/rest/v1/bill_participants?bill_id=eq.${billId}&select=*&order=created_at.asc`,
                {
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session!.access_token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                setParticipants(participantsData || []);
            }
        } catch (err) {
            console.error('PartyScreen: Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const setupRealtimeSubscription = () => {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        // Use Supabase Realtime via WebSocket
        // For simplicity, we'll poll every 3 seconds as a fallback
        const intervalId = setInterval(() => {
            fetchBillAndParticipants();
        }, 3000);

        return {
            unsubscribe: () => clearInterval(intervalId)
        };
    };

    const handleAddGuest = async () => {
        if (!guestName.trim() || !billId || !session) return;

        setIsAddingGuest(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            const newParticipant = {
                bill_id: billId,
                user_id: null, // Ghost user
                name: guestName.trim(),
                is_guest: true,
                color: getNextColor(participants.length),
                initials: getInitials(guestName.trim()),
            };

            const response = await fetch(
                `${supabaseUrl}/rest/v1/bill_participants`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(newParticipant),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to add guest');
            }

            const addedParticipant = await response.json();
            setParticipants(prev => [...prev, addedParticipant[0]]);
            setGuestName('');
            setShowAddModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error('PartyScreen: Error adding guest:', err);
            Alert.alert('Error', 'Failed to add guest. Please try again.');
        } finally {
            setIsAddingGuest(false);
        }
    };

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `Join my bill split on Divvit! ${deepLinkUrl}`,
                url: deepLinkUrl,
            });
        } catch (err) {
            console.error('PartyScreen: Error sharing:', err);
        }
    };

    const handleStartSplitting = async () => {
        if (!isHost) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Update bill status to 'started' (optional - for guest redirection)
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            await fetch(
                `${supabaseUrl}/rest/v1/bills?id=eq.${billId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session!.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({ status: 'started' }),
                }
            );
        } catch (err) {
            console.error('PartyScreen: Error updating bill status:', err);
        }

        // Navigate to Bill Editor with participants
        router.push({
            pathname: '/bill/[id]',
            params: {
                id: billId,
                billData: billData,
                fromParty: 'true',
            }
        });
    };

    // If bill has started and user is guest, redirect to editor
    useEffect(() => {
        if (billStatus === 'started' && !isHost && !isLoading) {
            router.replace({
                pathname: '/bill/[id]',
                params: {
                    id: billId!,
                    fromParty: 'true',
                }
            });
        }
    }, [billStatus, isHost, isLoading]);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#B54CFF" />
                <Text className="text-divvit-muted mt-4 font-body">Loading party...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 pt-2 pb-4">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 -ml-2 rounded-full border border-gray-200 bg-white"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                        }}
                    >
                        <ArrowLeft color="#111827" size={20} />
                    </TouchableOpacity>

                    <View className="flex-row items-center">
                        <Users size={20} color="#B54CFF" />
                        <Text className="ml-2 text-lg font-heading font-bold text-divvit-text">
                            Party Lobby
                        </Text>
                    </View>

                    <View className="w-10" />
                </View>
            </View>

            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* QR Code Section - Host Only */}
                {isHost && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        className="items-center py-6"
                    >
                        <View
                            className="bg-white p-6 rounded-3xl border border-gray-100"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.08,
                                shadowRadius: 12,
                                elevation: 4,
                            }}
                        >
                            <QRCode
                                value={deepLinkUrl}
                                size={180}
                                color="#111827"
                                backgroundColor="white"
                            />
                        </View>

                        <Text className="text-divvit-muted font-body text-sm mt-4 text-center">
                            Friends can scan to join
                        </Text>

                        <TouchableOpacity
                            onPress={handleShare}
                            className="flex-row items-center mt-4 px-5 py-3 bg-gray-100 rounded-full"
                        >
                            <Share2 size={18} color="#6B7280" />
                            <Text className="ml-2 text-divvit-text font-medium">Share Link</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Guest Waiting View */}
                {!isHost && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        className="items-center py-8"
                    >
                        <View className="w-20 h-20 rounded-full bg-purple-100 items-center justify-center mb-4">
                            <Users size={36} color="#B54CFF" />
                        </View>
                        <Text className="text-xl font-heading font-bold text-divvit-text text-center">
                            Waiting for Host
                        </Text>
                        <Text className="text-divvit-muted font-body text-center mt-2">
                            The host will start splitting soon...
                        </Text>
                    </Animated.View>
                )}

                {/* Roll Call Section */}
                <View className="mt-6">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-heading font-bold text-divvit-text">
                            Roll Call ({participants.length})
                        </Text>
                        {isHost && (
                            <TouchableOpacity
                                onPress={() => setShowAddModal(true)}
                                className="flex-row items-center px-4 py-2 bg-divvit-secondary rounded-full"
                                style={{
                                    shadowColor: '#B54CFF',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 4,
                                    elevation: 3,
                                }}
                            >
                                <UserPlus size={16} color="white" />
                                <Text className="ml-2 text-white font-heading font-bold text-sm">
                                    Add Person
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Participants List */}
                    <View className="gap-3">
                        {participants.map((participant, index) => (
                            <Animated.View
                                key={participant.id}
                                entering={FadeInDown.delay(index * 50).springify()}
                                layout={Layout.springify()}
                                className="flex-row items-center p-4 bg-white rounded-2xl border border-gray-100"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.03,
                                    shadowRadius: 2,
                                    elevation: 1,
                                }}
                            >
                                {/* Avatar */}
                                <View
                                    className="w-12 h-12 rounded-full items-center justify-center"
                                    style={{ backgroundColor: participant.color }}
                                >
                                    <Text className="font-heading font-bold text-white text-sm">
                                        {participant.initials}
                                    </Text>
                                </View>

                                {/* Name & Status */}
                                <View className="flex-1 ml-3">
                                    <View className="flex-row items-center">
                                        <Text className="font-heading font-medium text-divvit-text text-base">
                                            {participant.name}
                                        </Text>
                                        {participant.user_id === hostId && (
                                            <View className="ml-2 flex-row items-center bg-amber-100 px-2 py-0.5 rounded-full">
                                                <Crown size={10} color="#D97706" />
                                                <Text className="ml-1 text-amber-700 text-[10px] font-bold">
                                                    HOST
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-divvit-muted text-xs mt-0.5">
                                        {participant.is_guest ? 'Added by host' : 'Joined via link'}
                                    </Text>
                                </View>

                                {/* Status Indicator */}
                                <View className="w-3 h-3 rounded-full bg-green-400" />
                            </Animated.View>
                        ))}

                        {participants.length === 0 && (
                            <View className="py-8 items-center">
                                <Text className="text-divvit-muted font-body">
                                    No one has joined yet...
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action - Host Only */}
            {isHost && (
                <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100">
                    <TouchableOpacity
                        onPress={handleStartSplitting}
                        disabled={participants.length === 0}
                        className={`rounded-3xl h-16 flex-row items-center justify-center ${participants.length > 0 ? 'bg-divvit-secondary' : 'bg-gray-200'
                            }`}
                        style={participants.length > 0 ? {
                            shadowColor: '#B54CFF',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                        } : undefined}
                        activeOpacity={0.8}
                    >
                        <Text className={`font-heading text-lg font-bold ${participants.length > 0 ? 'text-white' : 'text-gray-400'
                            }`}>
                            Start Splitting 🎉
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Add Guest Modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center px-6">
                    <View
                        className="w-full bg-white rounded-3xl p-6"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.2,
                            shadowRadius: 20,
                            elevation: 10,
                        }}
                    >
                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-heading font-bold text-divvit-text">
                                Add Guest
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAddModal(false)}
                                className="p-2 -mr-2 rounded-full bg-gray-100"
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Name Input */}
                        <View className="h-14 bg-gray-50 rounded-2xl border border-gray-200 justify-center px-4 mb-4">
                            <TextInput
                                className="text-divvit-text font-body text-lg h-full"
                                placeholder="Enter name (e.g., Grandma)"
                                placeholderTextColor="#9CA3AF"
                                value={guestName}
                                onChangeText={setGuestName}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleAddGuest}
                            />
                        </View>

                        <Text className="text-divvit-muted text-sm mb-6">
                            This person will be added to the bill and can have items assigned to them.
                        </Text>

                        {/* Add Button */}
                        <TouchableOpacity
                            onPress={handleAddGuest}
                            disabled={!guestName.trim() || isAddingGuest}
                            className={`rounded-2xl h-14 items-center justify-center ${guestName.trim() ? 'bg-divvit-secondary' : 'bg-gray-200'
                                }`}
                        >
                            {isAddingGuest ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className={`font-heading font-bold text-base ${guestName.trim() ? 'text-white' : 'text-gray-400'
                                    }`}>
                                    Add to Party
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

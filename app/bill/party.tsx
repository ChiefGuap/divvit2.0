import React, { useState, useEffect, useRef } from 'react';
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
import { X, Share2, UserPlus, ArrowRight, Pencil, MoreHorizontal, BadgeCheck, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { Participant, BillStatus, getInitials, getNextColor } from '../../types';
import { supabase } from '../../lib/supabase';
import '../../global.css';

const getJoinedTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Ready to split';
    const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diffMins < 1) return 'Just joined';
    if (diffMins === 1) return 'Joined 1m ago';
    return `Joined ${diffMins}m ago`;
};

export default function PartyScreen() {
    const router = useRouter();
    const { id: billId, billData } = useLocalSearchParams<{ id: string; billData?: string }>();
    const { user, session } = useAuth();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [billStatus, setBillStatus] = useState<BillStatus>('draft');
    const [hostId, setHostId] = useState<string | null>(null);
    const [partyName, setPartyName] = useState('Party Lobby');

    const hasRedirected = useRef(false);
    const channelRef = useRef<any>(null);
    const hostIdRef = useRef<string | null>(null);

    const isHost = user?.id === hostId;
    const deepLinkUrl = Linking.createURL(`/bill/${billId}`);
    console.log('Generated Join Link:', deepLinkUrl);

    // Keep hostIdRef in sync so the broadcast handler (closure) always has the latest value
    useEffect(() => { hostIdRef.current = hostId; }, [hostId]);

    useEffect(() => {
        if (!billId || !session) return;
        fetchBillAndParticipants();
    }, [billId, session]);

    useEffect(() => {
        if (!billId) return;
        console.log('PartyScreen: Setting up Realtime subscription for bill', billId);

        const channel = supabase
            .channel(`party-${billId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'bills', filter: `id=eq.${billId}` },
                (payload) => {
                    console.log('PartyScreen Realtime: Bill updated', payload.new);
                    const newStatus = (payload.new as any).status as BillStatus;
                    setBillStatus(newStatus);
                    if ((payload.new as any).host_id) setHostId((payload.new as any).host_id);
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bill_participants', filter: `bill_id=eq.${billId}` },
                (payload) => {
                    console.log('PartyScreen Realtime: New participant joined', payload.new);
                    const newParticipant = payload.new as Participant;
                    setParticipants(prev => {
                        if (prev.some(p => p.id === newParticipant.id)) return prev;
                        return [...prev, newParticipant];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'bill_participants', filter: `bill_id=eq.${billId}` },
                (payload) => {
                    console.log('PartyScreen Realtime: Participant removed', payload.old);
                    const removedId = (payload.old as any).id;
                    setParticipants(prev => prev.filter(p => p.id !== removedId));
                }
            )
            .on(
                'broadcast',
                { event: 'session-started' },
                () => {
                    // Host navigates directly in handleStartSplitting; only guests act here
                    if (user?.id === hostIdRef.current) return;
                    if (hasRedirected.current) return;
                    console.log('PartyScreen: Broadcast received — session started, navigating guest to editor');
                    hasRedirected.current = true;
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.replace({ pathname: '/bill/[id]', params: { id: billId!, fromParty: 'true' } });
                }
            )
            .subscribe((status) => {
                console.log('PartyScreen Realtime: Channel status', status);
            });

        channelRef.current = channel;

        return () => {
            console.log('PartyScreen: Cleaning up Realtime subscription');
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [billId]);

    const fetchBillAndParticipants = async () => {
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
                    setBillStatus(billData[0].status as BillStatus);
                }
            }

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

    const handleRenameParty = () => {
        Alert.prompt(
            'Name your party',
            'e.g. Dinner at Sora',
            (text) => { if (text && text.trim()) setPartyName(text.trim()); },
            'plain-text',
            partyName,
        );
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
                user_id: null,
                name: guestName.trim(),
                is_guest: true,
                color: getNextColor(participants.length),
                initials: getInitials(guestName.trim()),
            };
            const response = await fetch(`${supabaseUrl}/rest/v1/bill_participants`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify(newParticipant),
            });
            if (!response.ok) throw new Error('Failed to add guest');
            const addedParticipant = await response.json();
            setParticipants(prev => {
                const newP = addedParticipant[0];
                if (prev.some(p => p.id === newP.id)) return prev;
                return [...prev, newP];
            });
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
            await Share.share({ message: `Join my bill split on Divvit! ${deepLinkUrl}`, url: deepLinkUrl });
        } catch (err) {
            console.error('PartyScreen: Error sharing:', err);
        }
    };

    const handleStartSplitting = async () => {
        if (!isHost) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Ensure bill_items exist (migrate from JSONB if capture didn't save them)
            const itemsCheck = await fetch(
                `${supabaseUrl}/rest/v1/bill_items?bill_id=eq.${billId}&select=id&limit=1`,
                {
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session!.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            const existingItems = itemsCheck.ok ? await itemsCheck.json() : [];

            if (existingItems.length === 0 && billData) {
                // No bill_items yet — create them from billData JSONB
                try {
                    const parsedBillData = JSON.parse(billData);
                    const items = parsedBillData.items || [];
                    if (items.length > 0) {
                        const itemsPayload = items.map((item: any) => ({
                            bill_id: billId,
                            name: item.name || '',
                            price: Number(item.price) || 0,
                            quantity: Number(item.quantity) || 1,
                        }));
                        await fetch(`${supabaseUrl}/rest/v1/bill_items`, {
                            method: 'POST',
                            headers: {
                                'apikey': supabaseKey!,
                                'Authorization': `Bearer ${session!.access_token}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal',
                            },
                            body: JSON.stringify(itemsPayload),
                        });
                        console.log('PartyScreen: Created bill_items from JSONB');
                    }
                } catch (e) {
                    console.error('PartyScreen: Error creating bill_items:', e);
                }
            }

            // Update bill status to active
            const response = await fetch(`${supabaseUrl}/rest/v1/bills?id=eq.${billId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session!.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ status: 'active' }),
            });
            if (!response.ok) {
                console.error('PartyScreen: Failed to update bill status:', response.status);
                Alert.alert('Error', 'Failed to start session. Please try again.');
                return;
            }
            console.log('PartyScreen: Bill status updated to active');
            // Broadcast to all guests so they navigate immediately (does not rely on postgres_changes RLS)
            channelRef.current?.send({ type: 'broadcast', event: 'session-started', payload: {} });
        } catch (err) {
            console.error('PartyScreen: Error updating bill:', err);
            Alert.alert('Error', 'Failed to start session. Please try again.');
            return;
        }
        // Host navigates after broadcast is sent
        router.push({
            pathname: '/bill/[id]',
            params: { id: billId, billData: billData, fromParty: 'true' },
        });
    };

    useEffect(() => {
        if (billStatus === 'active' && !isHost && !isLoading && !hasRedirected.current) {
            console.log('PartyScreen: Bill is active, redirecting guest to editor');
            hasRedirected.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({ pathname: '/bill/[id]', params: { id: billId!, fromParty: 'true' } });
        }
    }, [billStatus, isHost, isLoading]);

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff', alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#4b29b4" />
                <Text style={{ color: '#484554', marginTop: 16, fontWeight: '500' }}>Loading party...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, height: 56,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    style={{
                        width: 40, height: 40, borderRadius: 20,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(75,41,180,0.08)',
                    }}
                >
                    <X size={20} color="#4b29b4" />
                </TouchableOpacity>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#4b29b4', letterSpacing: -0.5 }}>
                    Divvit
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            >
                {/* Section 1 — Party Name */}
                <View style={{ alignItems: 'center', marginBottom: 28 }}>
                    <Text style={{
                        fontSize: 10, fontWeight: '800', color: '#4b29b4',
                        letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10,
                    }}>
                        Party Lobby
                    </Text>
                    <TouchableOpacity
                        onPress={handleRenameParty}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                        <Text style={{ fontSize: 28, fontWeight: '800', color: '#141b2b', letterSpacing: -0.5 }}>
                            {partyName}
                        </Text>
                        <View style={{
                            width: 28, height: 28, borderRadius: 8,
                            backgroundColor: 'rgba(75,41,180,0.08)',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Pencil size={14} color="#4b29b4" />
                        </View>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 13, color: '#484554', marginTop: 8, textAlign: 'center', fontWeight: '500' }}>
                        Scan the code or share the link to join
                    </Text>
                </View>

                {/* Section 2 — QR Code (host) or Waiting (guest) */}
                {isHost ? (
                    <Animated.View entering={FadeIn.duration(300)}>
                        <View style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 32,
                            padding: 24,
                            alignItems: 'center',
                            shadowColor: '#141b2b',
                            shadowOffset: { width: 0, height: 12 },
                            shadowOpacity: 0.06,
                            shadowRadius: 32,
                            elevation: 4,
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: 'rgba(202,196,214,0.2)',
                        }}>
                            <QRCode
                                value={deepLinkUrl}
                                size={180}
                                color="#111827"
                                backgroundColor="white"
                            />
                            <TouchableOpacity
                                onPress={handleShare}
                                activeOpacity={0.8}
                                style={{
                                    marginTop: 20,
                                    width: '100%',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: '#f1f3ff',
                                    borderRadius: 16,
                                    paddingVertical: 14,
                                }}
                            >
                                <Share2 size={18} color="#4b29b4" />
                                <Text style={{ color: '#4b29b4', fontWeight: '700', fontSize: 15 }}>Share Link</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={{ alignItems: 'center', paddingVertical: 32, marginBottom: 24 }}
                    >
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: '#e9edff', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Users size={36} color="#4b29b4" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#141b2b', marginBottom: 6 }}>
                            Waiting for Host
                        </Text>
                        <Text style={{ fontSize: 14, color: '#484554', textAlign: 'center', fontWeight: '500' }}>
                            The host will start splitting soon...
                        </Text>
                    </Animated.View>
                )}

                {/* Section 3 — Roll Call */}
                <View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'flex-start',
                        justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4,
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#141b2b', letterSpacing: -0.3 }}>
                                Roll Call
                            </Text>
                            <Text style={{ fontSize: 12, color: '#484554', fontWeight: '500', marginTop: 2 }}>
                                {participants.length} {participants.length === 1 ? 'member' : 'members'} joined
                            </Text>
                        </View>
                        {isHost && (
                            <TouchableOpacity
                                onPress={() => setShowAddModal(true)}
                                activeOpacity={0.8}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 6,
                                    backgroundColor: 'rgba(75,41,180,0.1)',
                                    paddingHorizontal: 16, paddingVertical: 8,
                                    borderRadius: 999,
                                }}
                            >
                                <UserPlus size={16} color="#4b29b4" />
                                <Text style={{ color: '#4b29b4', fontWeight: '700', fontSize: 13 }}>Add</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Participant rows */}
                    <View style={{ gap: 12 }}>
                        {participants.map((participant, index) => {
                            const isParticipantHost = participant.user_id === hostId;
                            return (
                                <Animated.View
                                    key={participant.id}
                                    entering={FadeInDown.delay(index * 50).springify()}
                                    layout={Layout.springify()}
                                    style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: 24,
                                        padding: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        shadowColor: '#141b2b',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.04,
                                        shadowRadius: 4,
                                        elevation: 1,
                                        borderWidth: 1,
                                        borderColor: 'rgba(202,196,214,0.15)',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                                        <View style={{
                                            width: 48, height: 48, borderRadius: 14,
                                            backgroundColor: participant.color || '#6346cd',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Text style={{ fontWeight: '700', color: '#ffffff', fontSize: 16 }}>
                                                {participant.initials}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '800', color: '#141b2b', fontSize: 14 }}>
                                                {participant.name}
                                            </Text>
                                            {isParticipantHost ? (
                                                <View style={{
                                                    alignSelf: 'flex-start', marginTop: 4,
                                                    backgroundColor: 'rgba(75,41,180,0.1)',
                                                    paddingHorizontal: 8, paddingVertical: 2,
                                                    borderRadius: 6,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 9, fontWeight: '800', color: '#4b29b4',
                                                        textTransform: 'uppercase', letterSpacing: 1,
                                                    }}>
                                                        Host
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={{ fontSize: 12, color: '#484554', fontWeight: '500', marginTop: 2 }}>
                                                    {participant.is_guest ? 'Added by host' : getJoinedTimeAgo((participant as any).created_at)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {isParticipantHost ? (
                                        <BadgeCheck size={22} color="#4b29b4" />
                                    ) : (
                                        <MoreHorizontal size={20} color="rgba(72,69,84,0.4)" />
                                    )}
                                </Animated.View>
                            );
                        })}

                        {participants.length === 0 && (
                            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                                <Text style={{ color: '#484554', fontWeight: '500', fontSize: 14 }}>
                                    No one has joined yet...
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Section 4 — Start Splitting (host only) */}
            {isHost && (
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16,
                }}>
                    <TouchableOpacity
                        onPress={handleStartSplitting}
                        disabled={participants.length === 0}
                        activeOpacity={0.85}
                        style={{
                            height: 60,
                            borderRadius: 999,
                            backgroundColor: participants.length > 0 ? '#4b29b4' : '#cac4d6',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            shadowColor: '#4b29b4',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: participants.length > 0 ? 0.3 : 0,
                            shadowRadius: 20,
                            elevation: participants.length > 0 ? 6 : 0,
                        }}
                    >
                        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 17 }}>
                            Start Splitting
                        </Text>
                        <ArrowRight size={20} color="#ffffff" />
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
                <View style={{
                    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
                }}>
                    <View style={{
                        width: '100%', backgroundColor: '#ffffff',
                        borderRadius: 28, padding: 24,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#141b2b' }}>Add Guest</Text>
                            <TouchableOpacity
                                onPress={() => setShowAddModal(false)}
                                style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: '#f1f3ff', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={18} color="#484554" />
                            </TouchableOpacity>
                        </View>

                        <View style={{
                            height: 52, backgroundColor: '#f9f9ff', borderRadius: 16,
                            borderWidth: 1, borderColor: '#e9edff',
                            justifyContent: 'center', paddingHorizontal: 16, marginBottom: 12,
                        }}>
                            <TextInput
                                placeholder="Enter name (e.g., Grandma)"
                                placeholderTextColor="#9CA3AF"
                                value={guestName}
                                onChangeText={setGuestName}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleAddGuest}
                                style={{ color: '#141b2b', fontSize: 16, padding: 0 }}
                            />
                        </View>

                        <Text style={{ color: '#484554', fontSize: 13, marginBottom: 20 }}>
                            This person will be added to the bill and can have items assigned to them.
                        </Text>

                        <TouchableOpacity
                            onPress={handleAddGuest}
                            disabled={!guestName.trim() || isAddingGuest}
                            style={{
                                height: 52, borderRadius: 16,
                                backgroundColor: guestName.trim() ? '#4b29b4' : '#e9edff',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            {isAddingGuest ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{
                                    fontWeight: '700', fontSize: 15,
                                    color: guestName.trim() ? '#ffffff' : '#9CA3AF',
                                }}>
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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Alert,
    ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Check, Lock, DollarSign, Smartphone, Banknote, Zap } from 'lucide-react-native';
import { usePlatformPay, PlatformPay } from '@stripe/stripe-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import {
    getBill,
    getBillItems,
    getParticipants,
    getPaymentRequests,
    markPaymentSent,
    confirmPayment,
    updateBillStatus,
    subscribeToBillStatus,
    subscribeToPaymentRequests,
    calculateShares,
    unsubscribeAll,
} from '../../services/billService';
import { BillItem, Participant, PaymentRequest } from '../../types';
import { 
    openVenmo, 
    openCashApp, 
    openAppleCash, 
    openZelle, 
    requestVenmo, 
    requestCashApp 
} from '../../utils/payments';
import { supabase } from '../../lib/supabase';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const COLORS = {
    primary: '#4142e3',
    primaryDim: '#3432d7',
    secondaryContainer: '#d6cbff',
    onSecondaryContainer: '#4a349d',
    surface: '#faf4ff',
    surfaceContainerHigh: '#e6deff',
    onSurface: '#302950',
    onSurfaceVariant: '#5e5680',
    green: '#16a34a',
    greenBg: '#dcfce7',
    amber: '#92400e',
    amberBg: '#fef3c7',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_GAP = 12;
const TILE_SIZE = (SCREEN_WIDTH - 40 - TILE_GAP) / 2;

type ProfileMap = Record<string, { venmo_handle: string | null; cashapp_handle: string | null }>;

export default function PaymentScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { billId } = useLocalSearchParams<{ billId: string }>();
    const { isPlatformPaySupported, createPlatformPayPaymentMethod } = usePlatformPay();

    const [isLoading, setIsLoading] = useState(true);
    const [bill, setBill] = useState<any>(null);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [hostProfile, setHostProfile] = useState<{ 
        venmo_handle: string | null; 
        cashapp_handle: string | null;
        zelle_handle: string | null;
        apple_pay_handle: string | null;
    } | null>(null);
    const [participantProfiles, setParticipantProfiles] = useState<ProfileMap>({});

    const hostId = bill?.host_id;
    const isHost = user?.id === hostId;

    const myParticipant = useMemo(
        () => participants.find(p => p.user_id === user?.id),
        [participants, user]
    );

    const myPaymentRequest = useMemo(
        () => paymentRequests.find(pr => pr.from_user_id === user?.id),
        [paymentRequests, user]
    );

    // ─── SHARE CALCULATION ─────────────────────────────────────────────────────

    const shares = useMemo(() => {
        if (participants.length === 0) return {};

        const tip = Number(bill?.details?.tip) || 0;
        const tax = Number(bill?.details?.tax) || 0;
        const detailItems: any[] = bill?.details?.items || [];
        const detailAssignments: Record<string, string[]> = bill?.details?.assignments || {};

        if (Object.keys(detailAssignments).length > 0 && detailItems.length > 0) {
            const detailSubtotal = detailItems.reduce(
                (sum: number, item: any) => sum + (Number(item.price) || 0), 0
            );
            const result: Record<string, number> = {};
            participants.forEach(p => { result[p.id] = 0; });

            detailItems.forEach((item: any) => {
                const assignedIds: string[] = detailAssignments[item.id] || [];
                if (assignedIds.length > 0) {
                    const perPerson = (Number(item.price) || 0) / assignedIds.length;
                    assignedIds.forEach(id => {
                        if (result[id] !== undefined) {
                            result[id] += perPerson;
                        }
                    });
                }
            });

            participants.forEach(p => {
                const itemShare = result[p.id];
                const proportion = detailSubtotal > 0
                    ? itemShare / detailSubtotal
                    : 1 / participants.length;
                result[p.id] += (tax + tip) * proportion;
            });

            return result;
        }

        if (billItems.length === 0) return {};
        return calculateShares(billItems, tax, tip, participants);
    }, [billItems, participants, bill]);

    const myAmount = myPaymentRequest?.amount || (myParticipant ? (shares[myParticipant.id] || 0) : 0);

    const hostParticipant = useMemo(
        () => participants.find(p => p.user_id === hostId),
        [participants, hostId]
    );

    const paidCount = paymentRequests.filter(pr => pr.status === 'confirmed').length;
    const totalCount = paymentRequests.length;

    const allPaymentsSettled = useMemo(() => {
        if (paymentRequests.length === 0) {
            const needsPayment = participants.filter(p => p.user_id !== hostId && !p.is_guest);
            return needsPayment.length === 0;
        }
        return paymentRequests.every(pr => pr.status === 'confirmed');
    }, [participants, paymentRequests, hostId]);

    // ─── DATA LOADING ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (!billId) return;

        const load = async () => {
            try {
                const [billData, items, parts, requests] = await Promise.all([
                    getBill(billId),
                    getBillItems(billId),
                    getParticipants(billId),
                    getPaymentRequests(billId),
                ]);
                setBill(billData);
                setBillItems(items);
                setParticipants(parts);
                setPaymentRequests(requests);

                if (billData.host_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('venmo_handle, cashapp_handle, zelle_handle, apple_pay_handle')
                        .eq('id', billData.host_id)
                        .single();
                    if (profile) setHostProfile(profile);
                }

                const userIds = parts
                    .filter(p => p.user_id && p.user_id !== billData.host_id)
                    .map(p => p.user_id!);
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, venmo_handle, cashapp_handle')
                        .in('id', userIds);
                    if (profiles) {
                        const map: ProfileMap = {};
                        profiles.forEach(p => { map[p.id] = p; });
                        setParticipantProfiles(map);
                    }
                }
            } catch (err) {
                console.error('PaymentScreen: Failed to load:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();

        const prChannel = subscribeToPaymentRequests(billId, (updated) => {
            setPaymentRequests(prev => {
                const exists = prev.find(pr => pr.id === updated.id);
                if (exists) return prev.map(pr => pr.id === updated.id ? updated : pr);
                return [...prev, updated];
            });
        });

        const statusChannel = subscribeToBillStatus(billId, (status) => {
            if (status === 'settled') {
                setBill((prev: any) => prev ? { ...prev, status: 'settled' } : prev);
            }
        });

        return () => unsubscribeAll([prChannel, statusChannel]);
    }, [billId]);

    // ─── GUEST PAYMENT HANDLERS ────────────────────────────────────────────────

    const doMarkAsSent = async (method: string) => {
        if (!myPaymentRequest) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await markPaymentSent(myPaymentRequest.id);
            await supabase.from('payment_requests').update({ payment_method: method }).eq('id', myPaymentRequest.id);
            setPaymentRequests(prev =>
                prev.map(pr => pr.id === myPaymentRequest.id ? { ...pr, status: 'sent' } : pr)
            );
        } catch (err) {
            console.error('PaymentScreen: Failed to mark sent:', err);
            Alert.alert('Error', 'Failed to update payment status.');
        }
    };

    const showDidYouPayDialog = (method: string) => {
        setTimeout(() => {
            Alert.alert(
                'Did you pay?',
                'Mark your payment as sent so the host can confirm it.',
                [
                    { text: 'Not Yet', style: 'cancel' },
                    { text: 'Mark as Sent', onPress: () => doMarkAsSent(method) },
                ]
            );
        }, 2000);
    };

    const handlePayVenmo = async () => {
        if (!hostProfile?.venmo_handle) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openVenmo(hostProfile.venmo_handle, myAmount, 'Divvit: Bill split');
        showDidYouPayDialog('venmo');
    };

    const handlePayCashApp = async () => {
        if (!hostProfile?.cashapp_handle) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openCashApp(hostProfile.cashapp_handle, myAmount);
        showDidYouPayDialog('cashapp');
    };

    const handlePayApplePay = async () => {
        if (!hostProfile?.apple_pay_handle) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openAppleCash(hostProfile.apple_pay_handle, myAmount, `Divvit: ${bill?.title || 'Bill split'}`);
        showDidYouPayDialog('applecash');
    };

    const handlePayZelle = async () => {
        if (!hostProfile?.zelle_handle) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openZelle(hostProfile.zelle_handle);
        showDidYouPayDialog('zelle');
    };

    const handlePayCash = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Pay with Cash',
            `Let ${hostParticipant?.name || 'the host'} know you're paying $${myAmount.toFixed(2)} in cash, then tap confirm.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => doMarkAsSent('cash') },
            ]
        );
    };

    // ─── HOST PAYMENT HANDLERS ─────────────────────────────────────────────────

    const handleConfirmPayment = async (requestId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await confirmPayment(requestId);
            setPaymentRequests(prev =>
                prev.map(pr => pr.id === requestId ? { ...pr, status: 'confirmed' } : pr)
            );
        } catch (err) {
            console.error('PaymentScreen: Failed to confirm:', err);
        }
    };

    const handleSettleBill = async () => {
        if (!billId) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await updateBillStatus(billId, 'settled');
            router.replace({
                pathname: '/bill/success' as any,
                params: {
                    billId: billId as string,
                    totalAmount: (Number(bill?.total_amount) || myAmount || 0).toFixed(2),
                    groupSize: participants.length.toString(),
                },
            });
        } catch (err) {
            console.error('PaymentScreen: Failed to settle:', err);
            Alert.alert('Error', 'Failed to settle bill.');
        }
    };

    const handleSettleOutside = () => {
        Alert.alert(
            'Settle Outside App',
            'Skip and mark the entire bill as settled? You can collect payments outside the app.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Settle Bill',
                    style: 'destructive',
                    onPress: async () => {
                        // Mark all payment_requests as confirmed
                        if (billId) {
                            await supabase
                                .from('payment_requests')
                                .update({ status: 'confirmed', payment_method: 'external' })
                                .eq('bill_id', billId);
                        }
                        await handleSettleBill();
                    },
                },
            ]
        );
    };

    const handleBackPress = () => {
        if (isHost) {
            Alert.alert(
                'Leave Payment Screen?',
                'You can check payment status later in your bill history.',
                [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Leave', onPress: () => router.replace('/(tabs)/') },
                ]
            );
        } else {
            router.back();
        }
    };

    const handleParticipantAction = useCallback((participant: Participant) => {
        const request = paymentRequests.find(pr => pr.from_user_id === participant.user_id);
        const amount = request?.amount || (shares[participant.id] || 0);
        const profile = participant.user_id ? participantProfiles[participant.user_id] : null;

        const alertOptions: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [];

        alertOptions.push({
            text: 'Request via Venmo',
            onPress: () => {
                if (profile?.venmo_handle) {
                    requestVenmo(profile.venmo_handle, amount, 'Divvit: Bill split');
                } else {
                    Alert.alert('No Venmo', `Ask ${participant.name} for their Venmo username first.`);
                }
            },
        });

        alertOptions.push({
            text: 'Request via Cash App',
            onPress: () => {
                if (profile?.cashapp_handle) {
                    requestCashApp(profile.cashapp_handle, amount);
                } else {
                    Alert.alert('No Cash App', `Ask ${participant.name} for their Cash App $cashtag first.`);
                }
            },
        });

        if (request && request.status !== 'confirmed') {
            alertOptions.push({
                text: 'Mark as Received',
                onPress: () => {
                    Alert.alert(
                        'Confirm Receipt',
                        `Confirm you received $${amount.toFixed(2)} from ${participant.name}?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Confirm', onPress: () => handleConfirmPayment(request.id) },
                        ]
                    );
                },
            });

            alertOptions.push({
                text: 'Settle Outside App',
                onPress: () => {
                    Alert.alert(
                        'Settle Outside',
                        `Mark ${participant.name}'s payment as settled outside Divvit?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Settle', onPress: () => handleConfirmPayment(request.id) },
                        ]
                    );
                },
            });
        }

        alertOptions.push({ text: 'Cancel', style: 'cancel' });

        Alert.alert(
            `${participant.name}`,
            `Owes $${amount.toFixed(2)}`,
            alertOptions
        );
    }, [shares, paymentRequests, participantProfiles]);

    // ─── LOADING STATE ─────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.onSurfaceVariant, marginTop: 16, fontWeight: '500' }}>Loading payment...</Text>
            </SafeAreaView>
        );
    }

    // ─── BUILD PAYMENT METHOD TILES (GUEST) ────────────────────────────────────

    const paymentTiles: Array<{
        key: string; label: string; subtitle: string;
        iconBg: string; icon: React.ReactNode; onPress: () => void;
    }> = [];

    if (!isHost) {
        if (hostProfile?.venmo_handle) {
            paymentTiles.push({
                key: 'venmo',
                label: 'Venmo',
                subtitle: `@${hostProfile.venmo_handle.replace(/^@/, '')}`,
                iconBg: '#EFF6FF',
                icon: <Text style={{ color: '#3D95CE', fontWeight: '900', fontSize: 28 }}>V</Text>,
                onPress: handlePayVenmo,
            });
        }
        if (hostProfile?.apple_pay_handle) {
            paymentTiles.push({
                key: 'applecash',
                label: 'Apple Cash',
                subtitle: 'Pay via Messages',
                iconBg: '#F3F4F6',
                icon: <Smartphone size={28} color="#000000" />,
                onPress: handlePayApplePay,
            });
        }
        if (hostProfile?.zelle_handle) {
            paymentTiles.push({
                key: 'zelle',
                label: 'Zelle',
                subtitle: 'Bank Transfer',
                iconBg: '#FAF5FF',
                icon: <Zap size={28} color="#6D1ED4" />,
                onPress: handlePayZelle,
            });
        }
        if (hostProfile?.cashapp_handle) {
            paymentTiles.push({
                key: 'cashapp',
                label: 'Cash App',
                subtitle: `$${hostProfile.cashapp_handle.replace(/^\$/, '')}`,
                iconBg: '#F0FDF4',
                icon: <DollarSign size={28} color="#00D632" />,
                onPress: handlePayCashApp,
            });
        }
        paymentTiles.push({
            key: 'cash',
            label: 'Cash',
            subtitle: 'Pay in person',
            iconBg: '#EEF2FF',
            icon: <Banknote size={28} color={COLORS.primary} />,
            onPress: handlePayCash,
        });
    }

    // ─── RENDER ────────────────────────────────────────────────────────────────

    const guestShowTiles = !isHost
        && myPaymentRequest?.status !== 'sent'
        && myPaymentRequest?.status !== 'confirmed';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, height: 56,
            }}>
                <TouchableOpacity
                    onPress={handleBackPress}
                    activeOpacity={0.7}
                    style={{
                        width: 40, height: 40, borderRadius: 20,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: COLORS.surfaceContainerHigh,
                    }}
                >
                    <ArrowLeft size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 }}>
                    Divvit
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 8 }}
            >
                {isHost ? renderHostView() : renderGuestView()}
            </ScrollView>

            {/* Fixed Bottom */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
                backgroundColor: COLORS.surface,
            }}>
                {isHost ? (
                    <View>
                        <TouchableOpacity
                            onPress={handleSettleBill}
                            disabled={!allPaymentsSettled}
                            activeOpacity={0.85}
                            style={{
                                height: 56, borderRadius: 999,
                                backgroundColor: allPaymentsSettled ? COLORS.primary : '#cac4d6',
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                                shadowColor: COLORS.primary,
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: allPaymentsSettled ? 0.3 : 0,
                                shadowRadius: 20,
                                elevation: allPaymentsSettled ? 6 : 0,
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 17 }}>
                                {allPaymentsSettled ? 'Complete Bill' : `Waiting for Payments...`}
                            </Text>
                            {allPaymentsSettled && <Check size={20} color="#ffffff" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSettleOutside}
                            activeOpacity={0.7}
                            style={{ alignItems: 'center', marginTop: 14 }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.onSurfaceVariant }}>
                                Skip and settle outside app {'\u203A'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : myPaymentRequest?.status === 'sent' || myPaymentRequest?.status === 'confirmed' ? (
                    <TouchableOpacity
                        onPress={() => router.replace({
                            pathname: '/bill/success' as any,
                            params: {
                                billId: billId as string,
                                totalAmount: myAmount.toFixed(2),
                                groupSize: participants.length.toString(),
                            },
                        })}
                        activeOpacity={0.85}
                        style={{
                            height: 56, borderRadius: 999, backgroundColor: COLORS.green,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}
                    >
                        <Check size={20} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 17 }}>Done</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 8, paddingVertical: 14,
                        backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 12,
                    }}>
                        <Lock size={14} color={COLORS.onSurfaceVariant} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                            Encrypted Transaction
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );

    // ─── GUEST VIEW ────────────────────────────────────────────────────────────

    function renderGuestView() {
        return (
            <View>
                {/* Badge + Title */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={{
                        backgroundColor: COLORS.secondaryContainer,
                        paddingHorizontal: 14, paddingVertical: 6,
                        borderRadius: 999, marginBottom: 12,
                    }}>
                        <Text style={{
                            fontSize: 10, fontWeight: '800', color: COLORS.onSecondaryContainer,
                            letterSpacing: 2, textTransform: 'uppercase',
                        }}>
                            Review Payment
                        </Text>
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.onSurface, textAlign: 'center' }}>
                        Settle with {hostParticipant?.name || 'Host'}
                    </Text>
                </View>

                {/* Hero Card */}
                <Animated.View entering={FadeInDown.springify()}>
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDim]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            borderRadius: 24, padding: 32, marginBottom: 28, alignItems: 'center',
                            overflow: 'hidden',
                            shadowColor: COLORS.primary,
                            shadowOffset: { width: 0, height: 20 },
                            shadowOpacity: 0.2,
                            shadowRadius: 50,
                            elevation: 8,
                        }}
                    >
                        {/* Decorative circle */}
                        <View style={{
                            position: 'absolute', right: -30, top: -30,
                            width: 140, height: 140, borderRadius: 70,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                        }} />

                        {/* Amount label */}
                        <Text style={{
                            fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)',
                            letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
                        }}>
                            Amount Owed
                        </Text>

                        {/* Amount */}
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
                                ${myAmount.toFixed(2)}
                            </Text>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginLeft: 6 }}>
                                USD
                            </Text>
                        </View>

                        {/* Divider + Bottom row */}
                        <View style={{
                            borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
                            marginTop: 24, paddingTop: 16, width: '100%',
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            {/* Overlapping avatars */}
                            <View style={{ flexDirection: 'row' }}>
                                {participants.slice(0, 5).map((p, i) => (
                                    <View key={p.id} style={{
                                        width: 28, height: 28, borderRadius: 14,
                                        backgroundColor: p.color || '#6346cd',
                                        alignItems: 'center', justifyContent: 'center',
                                        borderWidth: 2, borderColor: '#fff',
                                        marginLeft: i === 0 ? 0 : -8,
                                        zIndex: participants.length - i,
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                            {p.initials}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            {/* Split pill */}
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                paddingHorizontal: 12, paddingVertical: 5,
                                borderRadius: 999,
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>
                                    Split {participants.length} ways
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Payment Status Banners */}
                {myPaymentRequest?.status === 'sent' && (
                    <Animated.View entering={FadeIn} style={{
                        backgroundColor: COLORS.greenBg, borderRadius: 20, padding: 20,
                        marginBottom: 20, alignItems: 'center', gap: 8,
                    }}>
                        <View style={{
                            width: 48, height: 48, borderRadius: 24,
                            backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Check size={24} color="#fff" />
                        </View>
                        <Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 18 }}>
                            Payment Sent!
                        </Text>
                        <Text style={{ color: COLORS.green, fontWeight: '500', fontSize: 14, opacity: 0.7 }}>
                            Waiting for host to confirm receipt
                        </Text>
                    </Animated.View>
                )}
                {myPaymentRequest?.status === 'confirmed' && (
                    <Animated.View entering={FadeIn} style={{
                        backgroundColor: COLORS.greenBg, borderRadius: 20, padding: 20,
                        marginBottom: 20, alignItems: 'center', gap: 8,
                    }}>
                        <View style={{
                            width: 48, height: 48, borderRadius: 24,
                            backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Check size={24} color="#fff" />
                        </View>
                        <Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 18 }}>
                            Payment Confirmed
                        </Text>
                        <Text style={{ color: COLORS.green, fontWeight: '500', fontSize: 14, opacity: 0.7 }}>
                            Your host confirmed receipt
                        </Text>
                    </Animated.View>
                )}

                {/* Payment Method Grid */}
                {guestShowTiles && (
                    <View>
                        <Text style={{
                            fontSize: 18, fontWeight: '800', color: COLORS.onSurface,
                            marginBottom: 16,
                        }}>
                            Choose Method
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP }}>
                            {paymentTiles.map((tile, index) => (
                                <Animated.View
                                    key={tile.key}
                                    entering={FadeInDown.delay(index * 80).springify()}
                                    style={{
                                        width: paymentTiles.length === 1 ? '100%'
                                            : paymentTiles.length === 3 && index === 2 ? '100%'
                                            : TILE_SIZE,
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={tile.onPress}
                                        activeOpacity={0.8}
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: 20,
                                            padding: 20,
                                            height: TILE_SIZE,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            shadowColor: 'rgba(20,27,43,1)',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.06,
                                            shadowRadius: 12,
                                            elevation: 2,
                                        }}
                                    >
                                        <View style={{
                                            width: 72, height: 72, borderRadius: 999,
                                            backgroundColor: tile.iconBg,
                                            alignItems: 'center', justifyContent: 'center',
                                            marginBottom: 14,
                                        }}>
                                            {tile.icon}
                                        </View>
                                        <Text style={{ fontWeight: '800', color: COLORS.onSurface, fontSize: 17, textAlign: 'center' }}>
                                            {tile.label}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontWeight: '500', marginTop: 2, textAlign: 'center' }}>
                                            {tile.subtitle}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    }

    // ─── HOST VIEW ─────────────────────────────────────────────────────────────

    function renderHostView() {
        return (
            <View>
                {/* Title */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{
                        fontSize: 10, fontWeight: '800', color: COLORS.primary,
                        letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10,
                    }}>
                        Payment Status
                    </Text>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 }}>
                        {allPaymentsSettled ? 'All Settled! \uD83C\uDF89' : 'Waiting for Payments'}
                    </Text>
                </View>

                {/* Participant List */}
                {participants.map((participant, index) => {
                    const isParticipantHost = participant.user_id === hostId;
                    const request = paymentRequests.find(
                        pr => pr.from_user_id === participant.user_id
                    );
                    const amount = isParticipantHost
                        ? (shares[participant.id] || 0)
                        : (request?.amount || shares[participant.id] || 0);
                    const status = isParticipantHost
                        ? 'host'
                        : participant.is_guest
                            ? 'external'
                            : (request?.status || 'pending');

                    const canTap = !isParticipantHost && !participant.is_guest && status !== 'confirmed';

                    return (
                        <Animated.View
                            key={participant.id}
                            entering={FadeInDown.delay(index * 60).springify()}
                        >
                            <TouchableOpacity
                                onPress={() => canTap && handleParticipantAction(participant)}
                                activeOpacity={canTap ? 0.7 : 1}
                                style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: 20,
                                    padding: 16,
                                    marginBottom: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    shadowColor: 'rgba(20,27,43,1)',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 12,
                                    elevation: 2,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={{
                                        width: 52, height: 52, borderRadius: 14,
                                        backgroundColor: participant.color || '#6346cd',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Text style={{ fontWeight: '700', color: '#fff', fontSize: 17 }}>
                                            {participant.initials}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '800', color: COLORS.onSurface, fontSize: 16 }}>
                                            {participant.name}
                                        </Text>
                                        {!isParticipantHost && (
                                            <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, fontWeight: '500', marginTop: 2 }}>
                                                ${amount.toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {renderStatusBadge(status, request)}
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        );
    }

    function renderStatusBadge(status: string, request?: PaymentRequest) {
        switch (status) {
            case 'host':
                return (
                    <View style={{
                        backgroundColor: COLORS.greenBg, paddingHorizontal: 14, paddingVertical: 7,
                        borderRadius: 999,
                    }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.green, textTransform: 'uppercase', letterSpacing: 1 }}>
                            You
                        </Text>
                    </View>
                );
            case 'confirmed':
                return (
                    <View style={{
                        backgroundColor: COLORS.greenBg, paddingHorizontal: 14, paddingVertical: 7,
                        borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4,
                    }}>
                        <Check size={12} color={COLORS.green} />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.green, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Received
                        </Text>
                    </View>
                );
            case 'sent':
                return (
                    <TouchableOpacity
                        onPress={() => request && Alert.alert(
                            'Confirm Receipt',
                            `Confirm you received payment from this participant?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Confirm', onPress: () => handleConfirmPayment(request.id) },
                            ]
                        )}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: COLORS.amberBg, paddingHorizontal: 12, paddingVertical: 7,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.amber, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Confirm Receipt
                        </Text>
                    </TouchableOpacity>
                );
            case 'external':
                return (
                    <View style={{
                        backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 7,
                        borderRadius: 999,
                    }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Settle Outside
                        </Text>
                    </View>
                );
            default: // pending
                return (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: COLORS.secondaryContainer, paddingHorizontal: 14, paddingVertical: 7,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.onSecondaryContainer, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Request
                        </Text>
                    </TouchableOpacity>
                );
        }
    }
}

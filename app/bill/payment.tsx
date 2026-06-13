import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Alert,
    ActivityIndicator, Platform, Dimensions, Linking,
    BackHandler, Modal, Clipboard,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Check, Lock, DollarSign, Smartphone, Banknote, Zap, Building2 } from 'lucide-react-native';
import { usePlatformPay, PlatformPay } from '@stripe/stripe-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import DivvitLogo from '../../components/DivvitLogo';
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
    openZelleViaBank,
    getZelleBanks,
    getZelleBankById,
    requestVenmo, 
    requestCashApp,
    requestVenmoNoRecipient,
    requestCashAppNoRecipient
} from '../../utils/payments';
import type { ZelleBank } from '../../utils/payments';
import { supabase } from '../../lib/supabase';
import { useBillFlowSync } from '../../hooks/useBillFlowSync';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const COLORS = {
    primary: '#6346cd',
    primaryDim: '#4b29b4',
    secondaryContainer: '#e5e7eb',
    onSecondaryContainer: '#484554',
    surface: '#f9f9ff',
    surfaceContainerHigh: '#f1f3ff',
    onSurface: '#111827',
    onSurfaceVariant: '#484554',
    green: '#16a34a',
    greenBg: '#dcfce7',
    amber: '#92400e',
    amberBg: '#fef3c7',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_GAP = 12;
const TILE_SIZE = (SCREEN_WIDTH - 40 - TILE_GAP) / 2;

type ProfileMap = Record<string, { venmo_handle: string | null; cashapp_handle: string | null; zelle_handle: string | null }>;

export default function PaymentScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { billId, fromParty } = useLocalSearchParams<{ billId: string; fromParty: string }>();
    const isFromParty = fromParty === 'true';
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

    // ─── ZELLE BANK PREFERENCE ──────────────────────────────────────────────────
    const ZELLE_STORAGE_KEY = '@divvit_zelle_bank';
    const [savedZelleBank, setSavedZelleBank] = useState<ZelleBank | null>(null);
    const [showBankPicker, setShowBankPicker] = useState(false);
    const [zelleRequestParams, setZelleRequestParams] = useState<{
        contact: string;
        amount: number;
        name: string;
    } | null>(null);
    const hostId = bill?.host_id;
    const isHost = user?.id === hostId;

    useBillFlowSync(billId, 'completed', isHost);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (isFromParty && !isHost) {
                    return true;
                }
                handleBackPress();
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [isFromParty, isHost, billId])
    );

    const myParticipant = useMemo(
        () => participants.find(p => p.user_id === user?.id),
        [participants, user]
    );

    const myPaymentRequest = useMemo(() => {
        return paymentRequests.find(
            pr => pr.from_participant_id === myParticipant?.id ||
                  (pr.from_user_id && pr.from_user_id === user?.id)
        );
    }, [paymentRequests, myParticipant, user]);

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
            const needsPayment = participants.filter(p => p.user_id !== hostId);
            return needsPayment.length === 0;
        }
        return paymentRequests.every(pr => pr.status === 'confirmed');
    }, [participants, paymentRequests, hostId]);

    // ─── LOAD SAVED ZELLE BANK ───────────────────────────────────────────────────

    useEffect(() => {
        const loadZelleBank = async () => {
            try {
                const bankId = await AsyncStorage.getItem(ZELLE_STORAGE_KEY);
                if (bankId) {
                    const bank = getZelleBankById(bankId);
                    if (bank) setSavedZelleBank(bank);
                }
            } catch (e) {
                console.log('[Zelle] Failed to load saved bank:', e);
            }
        };
        loadZelleBank();
    }, []);

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
                        .select('id, venmo_handle, cashapp_handle, zelle_handle')
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

        return () => unsubscribeAll([prChannel]);
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
        if (!hostProfile?.venmo_handle) {
            Alert.alert(
                'Venmo Not Set Up',
                "The host hasn't added their Venmo username yet. Ask them to add it in their profile settings."
            );
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openVenmo(
            hostProfile.venmo_handle,
            myAmount,
            bill?.restaurant_name || 'Divvit Bill'
        );
        
        setTimeout(() => {
            Alert.alert(
                'Payment Complete?',
                `Did you send $${myAmount.toFixed(2)} via Venmo?`,
                [
                    { 
                        text: 'Yes, I paid!', 
                        onPress: () => doMarkAsSent('venmo')
                    },
                    { text: 'Not yet', style: 'cancel' }
                ]
            );
        }, 1500);
    };

    const handlePayCashApp = async () => {
        if (!hostProfile?.cashapp_handle) {
            Alert.alert(
                'Cash App Not Set Up',
                "The host hasn't added their Cash App tag yet."
            );
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openCashApp(
            hostProfile.cashapp_handle,
            myAmount
        );
        
        setTimeout(() => {
            Alert.alert(
                'Payment Complete?',
                `Did you send $${myAmount.toFixed(2)} via Cash App?`,
                [
                    {
                        text: 'Yes, I paid!',
                        onPress: () => doMarkAsSent('cashapp')
                    },
                    { text: 'Not yet', style: 'cancel' }
                ]
            );
        }, 1500);
    };

    const handlePayApplePay = async () => {
        if (!hostProfile?.apple_pay_handle) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await openAppleCash(hostProfile.apple_pay_handle, myAmount, `Divvit: ${bill?.title || 'Bill split'}`);
        showDidYouPayDialog('applecash');
    };

    const handlePayZelle = async () => {
        if (!hostProfile?.zelle_handle) {
            Alert.alert(
                'Zelle Not Set Up',
                "The host hasn't added their Zelle phone or email yet."
            );
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (savedZelleBank) {
            // Saved bank — open directly, zero friction
            const opened = await openZelleViaBank(
                savedZelleBank,
                hostProfile.zelle_handle,
                myAmount,
                hostParticipant?.name || 'Host'
            );
            if (opened) {
                setTimeout(() => {
                    Alert.alert(
                        'Payment Complete?',
                        `Did you send $${myAmount.toFixed(2)} via Zelle in ${savedZelleBank.name}?`,
                        [
                            { text: 'Yes, I paid!', onPress: () => doMarkAsSent('zelle') },
                            { text: 'Not yet', style: 'cancel' },
                        ]
                    );
                }, 2000);
            }
        } else {
            // No saved bank — show picker
            setShowBankPicker(true);
        }
    };

    const handleBankSelected = async (bank: ZelleBank) => {
        // Save the bank choice for next time
        try {
            await AsyncStorage.setItem(ZELLE_STORAGE_KEY, bank.id);
            setSavedZelleBank(bank);
        } catch (e) {
            console.log('[Zelle] Failed to save bank:', e);
        }

        setShowBankPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (zelleRequestParams) {
            const { contact, amount, name } = zelleRequestParams;
            setZelleRequestParams(null); // Clear params
            await openZelleViaBank(bank, contact, amount, name);
        } else {
            // Open bank app immediately after selection (paying guest flow)
            const opened = await openZelleViaBank(
                bank,
                hostProfile!.zelle_handle!,
                myAmount,
                hostParticipant?.name || 'Host'
            );
            if (opened) {
                setTimeout(() => {
                    Alert.alert(
                        'Payment Complete?',
                        `Did you send $${myAmount.toFixed(2)} via Zelle in ${bank.name}?`,
                        [
                            { text: 'Yes, I paid!', onPress: () => doMarkAsSent('zelle') },
                            { text: 'Not yet', style: 'cancel' },
                        ]
                    );
                }, 2000);
            }
        }
    };

    const handleChangeZelleBank = async () => {
        await Haptics.selectionAsync();
        setShowBankPicker(true);
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

    const handleBackPress = async () => {
        if (isFromParty && isHost) {
            Alert.alert(
                'Return to tip selection?',
                'Are you sure you want to go back? Guests will be returned to the tip selection screen.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Go Back',
                        onPress: async () => {
                            try {
                                await updateBillStatus(billId!, 'tip_selection');
                            } catch (err) {
                                console.error('Failed to return to tip selection:', err);
                            }
                        }
                    }
                ]
            );
        } else if (isHost) {
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
        const request = paymentRequests.find(
            pr => pr.from_participant_id === participant.id ||
                  (pr.from_user_id && participant.user_id && pr.from_user_id === participant.user_id)
        );
        const amount = request?.amount || (shares[participant.id] || 0);
        const profile = participant.user_id ? participantProfiles[participant.user_id] : null;

        const alertOptions: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [];

        alertOptions.push({
            text: profile?.venmo_handle
                ? '💙 Request via Venmo'
                : '💙 Request via Venmo (search manually)',
            onPress: async () => {
                if (profile?.venmo_handle) {
                    await requestVenmo(
                        profile.venmo_handle,
                        amount,
                        bill?.restaurant_name || 'Bill Split'
                    );
                } else {
                    await requestVenmoNoRecipient(
                        amount,
                        `Divvit: Bill split - ${participant.name}`
                    );
                }
            },
        });

        alertOptions.push({
            text: profile?.cashapp_handle
                ? '💚 Request via Cash App'
                : '💚 Request via Cash App (search manually)',
            onPress: async () => {
                if (profile?.cashapp_handle) {
                    await requestCashApp(profile.cashapp_handle, amount);
                } else {
                    await requestCashAppNoRecipient(amount);
                }
            },
        });

        alertOptions.push({
            text: '🏦 Request via Zelle',
            onPress: async () => {
                const zelleContact = profile?.zelle_handle;
                if (!zelleContact) {
                    Alert.alert(
                        'No Zelle',
                        `${participant.name} hasn't added their Zelle email or phone yet.`
                    );
                    return;
                }
                // Copy guest's Zelle contact to clipboard for the host
                Clipboard.setString(zelleContact);
                if (savedZelleBank) {
                    // Host has a saved bank — open it directly
                    Alert.alert(
                        'Request via Zelle',
                        `${participant.name}'s Zelle contact copied to clipboard.\n\nOpen ${savedZelleBank.name} and request $${amount.toFixed(2)} from:\n${zelleContact}`,
                        [
                            { text: `Open ${savedZelleBank.shortName}`, onPress: () => openZelleViaBank(savedZelleBank, zelleContact, amount, participant.name) },
                            {
                                text: 'Change Bank',
                                onPress: () => {
                                    setZelleRequestParams({
                                        contact: zelleContact,
                                        amount: amount,
                                        name: participant.name,
                                    });
                                    setShowBankPicker(true);
                                }
                            },
                            { text: 'Cancel', style: 'cancel' },
                        ]
                    );
                } else {
                    // No saved bank — show picker
                    Alert.alert(
                        'Request via Zelle',
                        `${participant.name}'s Zelle contact copied to clipboard: ${zelleContact}\n\nOpen your bank app and request $${amount.toFixed(2)} via Zelle.`,
                        [
                            {
                                text: 'Select Bank',
                                onPress: () => {
                                    setZelleRequestParams({
                                        contact: zelleContact,
                                        amount: amount,
                                        name: participant.name,
                                    });
                                    setShowBankPicker(true);
                                }
                            },
                            { text: 'Cancel', style: 'cancel' },
                        ]
                    );
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
                <Stack.Screen options={{ headerShown: false, gestureEnabled: !isFromParty || isHost }} />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.onSurfaceVariant, marginTop: 16, fontWeight: '500', fontFamily: 'Outfit' }}>Loading payment...</Text>
            </SafeAreaView>
        );
    }

    // ─── BUILD PAYMENT METHOD TILES (GUEST) ────────────────────────────────────

    const paymentTiles: Array<{
        key: string; label: string; subtitle: string;
        iconBg: string; icon: React.ReactNode; onPress: () => void;
        onLongPress?: () => void;
    }> = [];

    if (!isHost) {
        if (hostProfile?.venmo_handle) {
            paymentTiles.push({
                key: 'venmo',
                label: 'Venmo',
                subtitle: `@${hostProfile.venmo_handle.replace(/^@/, '')}`,
                iconBg: '#EFF6FF',
                icon: <Text style={{ color: '#3D95CE', fontWeight: '800', fontSize: 28 }}>V</Text>,
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
                subtitle: savedZelleBank ? `via ${savedZelleBank.shortName}` : 'Select your bank',
                iconBg: '#FAF5FF',
                icon: <Building2 size={28} color="#6346cd" />,
                onPress: handlePayZelle,
                onLongPress: savedZelleBank ? handleChangeZelleBank : undefined,
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
            <Stack.Screen options={{ headerShown: false, gestureEnabled: !isFromParty || isHost }} />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, height: 56,
            }}>
                {(!isFromParty || isHost) ? (
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
                ) : (
                    <View style={{ width: 40 }} />
                )}
                <DivvitLogo />
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
                                backgroundColor: allPaymentsSettled ? COLORS.primary : '#e5e7eb',
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

            {/* ─── ZELLE BANK PICKER MODAL ───────────────────────────────── */}
            <Modal
                visible={showBankPicker}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setShowBankPicker(false);
                    setZelleRequestParams(null);
                }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => {
                        setShowBankPicker(false);
                        setZelleRequestParams(null);
                    }}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        justifyContent: 'flex-end',
                    }}
                >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                        <View style={{
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            paddingTop: 12,
                            paddingBottom: 44,
                            paddingHorizontal: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -8 },
                            shadowOpacity: 0.12,
                            shadowRadius: 24,
                            elevation: 16,
                        }}>
                            {/* Drag indicator */}
                            <View style={{
                                width: 40, height: 4, borderRadius: 2,
                                backgroundColor: '#e5e7eb',
                                alignSelf: 'center', marginBottom: 20,
                            }} />

                            {/* Header */}
                            <View style={{ marginBottom: 8 }}>
                                <Text style={{
                                    fontSize: 22, fontWeight: '800',
                                    color: COLORS.onSurface, marginBottom: 4,
                                }}>
                                    Select Your Bank
                                </Text>
                                <Text style={{
                                    fontSize: 14, fontWeight: '500',
                                    color: COLORS.onSurfaceVariant,
                                }}>
                                    We'll open your bank app for Zelle payment.
                                    {savedZelleBank ? '' : ' Your choice is saved for next time.'}
                                </Text>
                            </View>

                            {/* Bank Grid */}
                            <View style={{
                                flexDirection: 'row', flexWrap: 'wrap',
                                gap: 10, marginTop: 16,
                            }}>
                                {getZelleBanks().map((bank, index) => (
                                    <Animated.View
                                        key={bank.id}
                                        entering={FadeInDown.delay(index * 40).springify()}
                                        style={{ width: (Dimensions.get('window').width - 60) / 2 }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => handleBankSelected(bank)}
                                            activeOpacity={0.75}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: savedZelleBank?.id === bank.id
                                                    ? `${bank.color}12`
                                                    : '#f9fafb',
                                                borderRadius: 16,
                                                padding: 14,
                                                borderWidth: savedZelleBank?.id === bank.id ? 2 : 1,
                                                borderColor: savedZelleBank?.id === bank.id
                                                    ? bank.color
                                                    : '#f1f3f5',
                                            }}
                                        >
                                            <View style={{
                                                width: 40, height: 40, borderRadius: 12,
                                                backgroundColor: bank.color,
                                                alignItems: 'center', justifyContent: 'center',
                                                marginRight: 12,
                                            }}>
                                                <Text style={{
                                                    color: '#ffffff', fontWeight: '800',
                                                    fontSize: 18,
                                                }}>
                                                    {bank.iconLetter}
                                                </Text>
                                            </View>
                                            <Text style={{
                                                fontWeight: '700', fontSize: 14,
                                                color: COLORS.onSurface,
                                                flex: 1,
                                            }} numberOfLines={1}>
                                                {bank.shortName}
                                            </Text>
                                            {savedZelleBank?.id === bank.id && (
                                                <Check size={16} color={bank.color} />
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                ))}
                            </View>

                            {/* Change bank hint */}
                            {savedZelleBank && (
                                <Text style={{
                                    fontSize: 12, fontWeight: '500',
                                    color: COLORS.onSurfaceVariant,
                                    textAlign: 'center', marginTop: 16,
                                    opacity: 0.7,
                                }}>
                                    Tap a different bank to switch
                                </Text>
                            )}

                            {/* Cancel */}
                            <TouchableOpacity
                                onPress={() => {
                                    setShowBankPicker(false);
                                    setZelleRequestParams(null);
                                }}
                                activeOpacity={0.7}
                                style={{
                                    alignItems: 'center', marginTop: 20,
                                    paddingVertical: 14,
                                    backgroundColor: COLORS.surfaceContainerHigh,
                                    borderRadius: 999,
                                }}
                            >
                                <Text style={{
                                    fontSize: 15, fontWeight: '700',
                                    color: COLORS.onSurfaceVariant,
                                }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
                                        onLongPress={tile.onLongPress}
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
                                        {tile.key === 'zelle' && savedZelleBank && (
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleChangeZelleBank();
                                                }}
                                                activeOpacity={0.6}
                                                style={{
                                                    position: 'absolute',
                                                    top: 14,
                                                    right: 14,
                                                    backgroundColor: `${COLORS.primary}12`,
                                                    paddingVertical: 4,
                                                    paddingHorizontal: 8,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <Text style={{
                                                    fontSize: 10,
                                                    fontWeight: '700',
                                                    color: COLORS.primary,
                                                }}>
                                                    Change
                                                </Text>
                                            </TouchableOpacity>
                                        )}

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

                        {__DEV__ && (
                            <TouchableOpacity
                                style={{
                                    marginTop: 16,
                                    padding: 12,
                                    backgroundColor: '#f1f3ff',
                                    borderRadius: 12,
                                    alignItems: 'center',
                                }}
                                onPress={async () => {
                                    // Test each scheme
                                    const schemes = [
                                        'venmo://',
                                        'cashme://',
                                        'zelle://',
                                        'paypal://',
                                    ];
                                    const results: Record<string, boolean> = {};
                                    for (const scheme of schemes) {
                                        results[scheme] = await Linking.canOpenURL(scheme);
                                    }
                                    Alert.alert(
                                        'Deep Link Test Results',
                                        Object.entries(results)
                                            .map(([scheme, canOpen]) => 
                                                `${scheme}: ${canOpen ? '✅ Can open' : '❌ Cannot open'}`
                                            )
                                            .join('\n'),
                                        [{ text: 'OK' }]
                                    );
                                }}
                            >
                                <Text style={{ fontSize: 12, color: '#484554', fontWeight: '600' }}>
                                    🔧 Test Deep Links (dev only)
                                </Text>
                            </TouchableOpacity>
                        )}
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
                        pr => pr.from_participant_id === participant.id ||
                              (pr.from_user_id && participant.user_id && pr.from_user_id === participant.user_id)
                    );
                    const amount = isParticipantHost
                        ? (shares[participant.id] || 0)
                        : (request?.amount || shares[participant.id] || 0);
                    const status = isParticipantHost
                        ? 'host'
                        : (request?.status || (participant.is_guest ? 'external' : 'pending'));

                    const canTap = !isParticipantHost && status !== 'confirmed';

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

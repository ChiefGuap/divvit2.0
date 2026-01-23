import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { openVenmo, openCashApp } from '../../utils/payments';

// --- Types ---
type User = {
    id: string;
    name: string;
    avatar: string;
    color: string;
    initials: string;
};

type BillItem = {
    id: string;
    name: string;
    price: number;
    share_of_tip: number;
};

type PaymentMethod = 'venmo' | 'cashapp' | 'cash';

type HostPaymentMethods = {
    venmo_handle: string | null;
    cashapp_handle: string | null;
};

export default function CheckoutScreen() {
    const router = useRouter();
    const { user, session } = useAuth();
    const { billId, billData, users: usersParam, assignments: assignmentsParam, userTotals: userTotalsParam } =
        useLocalSearchParams<{
            billId: string;
            billData: string;
            users: string;
            assignments: string;
            userTotals: string;
        }>();

    // Parse incoming data
    const billInfo = useMemo(() => {
        if (billData) {
            try {
                return JSON.parse(billData);
            } catch (e) {
                console.error('Failed to parse billData', e);
            }
        }
        return { items: [], tip: 0, total: 0, subtotal: 0 };
    }, [billData]);

    const users: User[] = useMemo(() => {
        if (usersParam) {
            try {
                return JSON.parse(usersParam);
            } catch (e) {
                console.error('Failed to parse users', e);
            }
        }
        return [];
    }, [usersParam]);

    const assignments = useMemo(() => {
        if (assignmentsParam) {
            try {
                return JSON.parse(assignmentsParam);
            } catch (e) {
                console.error('Failed to parse assignments', e);
            }
        }
        return {};
    }, [assignmentsParam]);

    const userTotals: Record<string, number> = useMemo(() => {
        if (userTotalsParam) {
            try {
                return JSON.parse(userTotalsParam);
            } catch (e) {
                console.error('Failed to parse userTotals', e);
            }
        }
        return {};
    }, [userTotalsParam]);

    // State
    const [paidUsers, setPaidUsers] = useState<string[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUserForPayment, setSelectedUserForPayment] = useState<User | null>(null);
    const [isClosingBill, setIsClosingBill] = useState(false);
    const [billHostId, setBillHostId] = useState<string | null>(null);
    const [hostPaymentMethods, setHostPaymentMethods] = useState<HostPaymentMethods>({
        venmo_handle: null,
        cashapp_handle: null,
    });

    // Use fetched host ID, fallback to current user for backwards compatibility
    const hostId = billHostId || user?.id;

    // Fetch bill host and their payment methods on mount
    useEffect(() => {
        if (!user || !session) return;

        const fetchBillHostAndPaymentMethods = async () => {
            try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

                // First fetch the bill to get the actual host_id
                const billResponse = await fetch(
                    `${supabaseUrl}/rest/v1/bills?id=eq.${billId}&select=host_id`,
                    {
                        headers: {
                            'apikey': supabaseKey!,
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                let actualHostId = user.id; // Fallback to current user
                if (billResponse.ok) {
                    const bills = await billResponse.json();
                    if (bills && bills.length > 0 && bills[0].host_id) {
                        actualHostId = bills[0].host_id;
                        setBillHostId(actualHostId);
                    }
                }

                // Now fetch the host's payment methods
                const response = await fetch(
                    `${supabaseUrl}/rest/v1/profiles?id=eq.${actualHostId}&select=venmo_handle,cashapp_handle`,
                    {
                        headers: {
                            'apikey': supabaseKey!,
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response.ok) {
                    const profiles = await response.json();
                    if (profiles && profiles.length > 0) {
                        setHostPaymentMethods({
                            venmo_handle: profiles[0].venmo_handle || null,
                            cashapp_handle: profiles[0].cashapp_handle || null,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch host payment methods:', error);
            }
        };

        fetchBillHostAndPaymentMethods();
    }, [user, session, billId]);

    // Check if all non-host users have paid (host is auto-settled)
    const nonHostUsers = users.filter(u => u.id !== hostId);
    const allPaid = nonHostUsers.length === 0 || nonHostUsers.every(u => paidUsers.includes(u.id));

    // Handlers
    const handlePayPress = (targetUser: User) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Check if host has any payment methods configured
        const hasVenmo = !!hostPaymentMethods.venmo_handle;
        const hasCashApp = !!hostPaymentMethods.cashapp_handle;

        if (!hasVenmo && !hasCashApp) {
            Alert.alert(
                'Payment Methods Not Set Up',
                'The host has not set up any payment methods yet. They can add Venmo or Cash App in their Profile.',
                [{ text: 'OK' }]
            );
            return;
        }

        setSelectedUserForPayment(targetUser);
        setModalVisible(true);
    };

    const handlePaymentMethodSelect = async (method: PaymentMethod) => {
        if (!selectedUserForPayment) return;

        const amountOwed = userTotals[selectedUserForPayment.id] || 0;
        const note = `Divvit - Payment from ${selectedUserForPayment.name}`;

        if (method === 'venmo' && hostPaymentMethods.venmo_handle) {
            await openVenmo(hostPaymentMethods.venmo_handle, amountOwed, note);
        } else if (method === 'cashapp' && hostPaymentMethods.cashapp_handle) {
            await openCashApp(hostPaymentMethods.cashapp_handle, amountOwed);
        }

        // Mark as paid (for hosting flow - user marks guest as paid)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPaidUsers(prev => [...prev, selectedUserForPayment.id]);
        setModalVisible(false);
        setSelectedUserForPayment(null);
    };

    const handleCloseBill = async () => {
        setIsClosingBill(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            if (!user || !session) {
                console.error('Checkout: No user or session');
                Alert.alert('Error', 'You must be logged in to close a bill.');
                setIsClosingBill(false);
                return;
            }

            console.log('Checkout: Closing bill and setting status to settled...');

            // Use direct fetch to update the existing bill
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Update payload - set status to 'settled' so it shows in History
            const updateData = {
                status: 'settled', // CRITICAL: This makes it appear in History tab
                total_amount: billInfo.total,
                details: {
                    items: billInfo.items,
                    tip: billInfo.tip,
                    subtotal: billInfo.subtotal,
                    users: users,
                    assignments: assignments,
                    userTotals: userTotals,
                    paidStatus: paidUsers,
                    closedAt: new Date().toISOString()
                }
            };

            console.log('Checkout: Updating bill with status=settled');

            // UPDATE existing bill instead of creating new one
            const response = await fetch(`${supabaseUrl}/rest/v1/bills?id=eq.${billId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            console.log('Checkout: Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Checkout: Error updating bill:', errorText);
                Alert.alert('Error', `Failed to close bill: ${errorText}`);
                setIsClosingBill(false);
                return;
            }

            const savedBill = await response.json();
            console.log('Checkout: Bill closed successfully:', savedBill);

            // Navigate to History tab so user can see the completed bill
            router.replace('/(tabs)/history');
        } catch (error) {
            console.error('Checkout: Exception closing bill:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
            setIsClosingBill(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 pt-2 pb-4">
                <View className="flex-row items-center">
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
                    <Text className="ml-4 text-xl font-heading font-bold text-divvit-text">Checkout</Text>
                </View>
            </View>

            {/* User Payment Rows */}
            <ScrollView
                contentContainerStyle={{ paddingBottom: 200, paddingTop: 10 }}
                showsVerticalScrollIndicator={false}
            >
                {users.map((user, index) => {
                    const isPaid = paidUsers.includes(user.id);
                    const amountOwed = userTotals[user.id] || 0;

                    return (
                        <View
                            key={user.id}
                        >
                            <View
                                className="mx-0 mb-0 overflow-hidden"
                                style={{
                                    backgroundColor: user.color,
                                    opacity: isPaid ? 0.7 : 1,
                                }}
                            >
                                <View className="flex-row items-center justify-between px-5 py-6">
                                    {/* Left: Name */}
                                    <Text className="font-heading text-2xl font-bold text-white flex-1" numberOfLines={1}>
                                        {user.name}
                                    </Text>

                                    {/* Center: Amount */}
                                    <View className="items-end mr-4">
                                        <Text className="text-white/70 font-body text-xs uppercase tracking-wider">
                                            OWES
                                        </Text>
                                        <Text className="font-heading text-2xl font-bold text-white">
                                            ${amountOwed.toFixed(2)}
                                        </Text>
                                    </View>

                                    {/* Right: Pay/Paid Button or Host Badge */}
                                    {user.id === hostId ? (
                                        // Host sees "Settled" badge instead of PAY button
                                        <View
                                            className="px-5 py-3 rounded-xl items-center justify-center bg-[#22C55E]"
                                            style={{ minWidth: 80 }}
                                        >
                                            <View className="flex-row items-center">
                                                <Text className="font-heading font-bold text-white text-sm mr-1">SETTLED</Text>
                                                <Check size={16} color="white" strokeWidth={3} />
                                            </View>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => !isPaid && handlePayPress(user)}
                                            disabled={isPaid}
                                            activeOpacity={0.8}
                                            className={`px-5 py-3 rounded-xl items-center justify-center ${isPaid ? 'bg-[#22C55E]' : 'bg-white'
                                                }`}
                                            style={{ minWidth: 80 }}
                                        >
                                            {isPaid ? (
                                                <View className="flex-row items-center">
                                                    <Text className="font-heading font-bold text-white text-lg mr-1">PAID</Text>
                                                    <Check size={18} color="white" strokeWidth={3} />
                                                </View>
                                            ) : (
                                                <View className="flex-row items-center">
                                                    <Text className="font-heading font-bold text-divvit-text text-lg mr-1">PAY</Text>
                                                    <ArrowRight size={18} color="#111827" strokeWidth={3} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Bottom Section: User Avatars Summary */}
            <View className="absolute bottom-0 left-0 right-0 bg-white pb-10 pt-6">
                {/* Avatar Row */}
                <View className="flex-row justify-center items-end mb-4 px-5">
                    {users.map((user) => {
                        const isPaid = paidUsers.includes(user.id);
                        const amountOwed = userTotals[user.id] || 0;

                        return (
                            <View key={user.id} className="items-center mx-3">
                                <View
                                    className={`w-14 h-14 rounded-full items-center justify-center border-2 ${isPaid ? 'border-[#22C55E]' : 'border-gray-200'
                                        }`}
                                    style={{ backgroundColor: user.color }}
                                >
                                    <Text className="font-heading font-bold text-white text-lg">
                                        {user.initials}
                                    </Text>
                                </View>
                                <Text className="font-heading font-bold text-divvit-text mt-2 text-sm">
                                    ${amountOwed.toFixed(2)}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Close Bill Button - only shows when all paid */}
                {allPaid && (
                    <View
                        className="px-5 mt-4"
                    >
                        <TouchableOpacity
                            onPress={handleCloseBill}
                            disabled={isClosingBill}
                            activeOpacity={0.85}
                            className="bg-divvit-secondary py-4 px-6 rounded-2xl flex-row items-center justify-center"
                            style={{
                                shadowColor: '#B54CFF',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12,
                                opacity: isClosingBill ? 0.7 : 1,
                            }}
                        >
                            <Text className="text-white font-heading font-bold text-lg mr-2">
                                {isClosingBill ? 'Closing Bill...' : 'Close Bill'}
                            </Text>
                            <Check size={20} color="white" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Payment Method Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <View
                        className="bg-white rounded-t-3xl pb-10"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 10,
                        }}
                    >
                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                            <Text className="font-heading text-xl font-bold text-divvit-text">
                                Mark {selectedUserForPayment?.name} as Paid
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setSelectedUserForPayment(null);
                                }}
                                className="p-2 rounded-full bg-gray-100"
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Payment Options */}
                        <View className="px-5 pt-4">
                            {hostPaymentMethods.venmo_handle && (
                                <TouchableOpacity
                                    onPress={() => handlePaymentMethodSelect('venmo')}
                                    activeOpacity={0.7}
                                    className="flex-row items-center py-4 px-4 mb-3 rounded-2xl bg-gray-50 border border-gray-100"
                                >
                                    <Text className="text-2xl mr-4">💸</Text>
                                    <Text className="font-heading text-lg font-bold text-divvit-text flex-1">
                                        Received via Venmo
                                    </Text>
                                    <ArrowRight size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                            {hostPaymentMethods.cashapp_handle && (
                                <TouchableOpacity
                                    onPress={() => handlePaymentMethodSelect('cashapp')}
                                    activeOpacity={0.7}
                                    className="flex-row items-center py-4 px-4 mb-3 rounded-2xl bg-gray-50 border border-gray-100"
                                >
                                    <Text className="text-2xl mr-4">💵</Text>
                                    <Text className="font-heading text-lg font-bold text-divvit-text flex-1">
                                        Received via Cash App
                                    </Text>
                                    <ArrowRight size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => handlePaymentMethodSelect('cash')}
                                activeOpacity={0.7}
                                className="flex-row items-center py-4 px-4 mb-3 rounded-2xl bg-gray-50 border border-gray-100"
                            >
                                <Text className="text-2xl mr-4">🤝</Text>
                                <Text className="font-heading text-lg font-bold text-divvit-text flex-1">
                                    Received Cash
                                </Text>
                                <ArrowRight size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

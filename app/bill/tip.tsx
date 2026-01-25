import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';

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
};

// Tip percentage options matching beta tester feedback
const TIP_PERCENTAGES = [
    { value: 0.15, label: '15%' },
    { value: 0.18, label: '18%' },
    { value: 0.20, label: '20%' },
];

export default function TipScreen() {
    const router = useRouter();
    const {
        billId,
        billData,
        users: usersParam,
        assignments: assignmentsParam,
        scannedTip: scannedTipParam
    } = useLocalSearchParams<{
        billId: string;
        billData: string;
        users: string;
        assignments: string;
        scannedTip: string;
    }>();

    // Parse incoming data
    const { items, subtotal, tax } = useMemo((): { items: BillItem[]; subtotal: number; tax: number } => {
        if (billData) {
            try {
                const parsed = JSON.parse(billData);
                return {
                    items: parsed.items || [],
                    subtotal: Number(parsed.subtotal) || 0,
                    tax: Number(parsed.tax) || 0
                };
            } catch (e) {
                console.error('Failed to parse billData', e);
            }
        }
        return { items: [], subtotal: 0, tax: 0 };
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

    const scannedTip = useMemo(() => {
        return Number(scannedTipParam) || 0;
    }, [scannedTipParam]);

    // State
    const [noTip, setNoTip] = useState(false);
    const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');
    const [hasAutoSkipped, setHasAutoSkipped] = useState(false);

    // Pre-fill from scanned tip on mount, and auto-skip to checkout if tip was already on receipt
    useEffect(() => {
        if (scannedTip > 0 && subtotal > 0) {
            const tipPercentage = scannedTip / subtotal;

            // Check if it matches one of our percentage options (within 1% tolerance)
            const matchingPercentage = TIP_PERCENTAGES.find(
                p => Math.abs(p.value - tipPercentage) < 0.01
            );

            if (matchingPercentage) {
                setSelectedPercentage(matchingPercentage.value);
            } else {
                // Use custom amount
                setCustomTip(scannedTip.toFixed(2));
            }

            // Auto-skip to checkout since tip was already on the receipt
            // Use a small delay so user briefly sees the pre-filled tip
            if (!hasAutoSkipped) {
                setHasAutoSkipped(true);
                setTimeout(() => {
                    handleAutoSkipToCheckout(scannedTip);
                }, 500);
            }
        } else {
            // Default to 18% (middle option)
            setSelectedPercentage(0.18);
        }
    }, [scannedTip, subtotal]);

    // Auto-skip function for when tip was scanned
    const handleAutoSkipToCheckout = (tipValue: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const totalWithTip = subtotal + tipValue;

        // Distribute tip proportionally to items
        const itemsWithTip = items.map((item: BillItem) => {
            const tipShare = subtotal > 0
                ? (item.price / subtotal) * tipValue
                : 0;
            return {
                ...item,
                share_of_tip: Math.round(tipShare * 100) / 100
            };
        });

        // Calculate user totals with tip included
        const userTotals: Record<string, number> = {};
        users.forEach(u => userTotals[u.id] = 0);

        Object.entries(assignments).forEach(([itemId, userIds]) => {
            const item = itemsWithTip.find((i: any) => i.id === itemId);
            if (item && Array.isArray(userIds) && userIds.length > 0) {
                const costPerUser = (item.price + item.share_of_tip) / userIds.length;
                userIds.forEach((userId: string) => {
                    if (userTotals[userId] !== undefined) {
                        userTotals[userId] += costPerUser;
                    }
                });
            }
        });

        router.push({
            pathname: '/bill/checkout' as any,
            params: {
                billId: billId,
                billData: JSON.stringify({
                    items: itemsWithTip,
                    tip: tipValue,
                    tax: tax,
                    total: totalWithTip,
                    subtotal: subtotal
                }),
                users: JSON.stringify(users),
                assignments: JSON.stringify(assignments),
                userTotals: JSON.stringify(userTotals)
            }
        });
    };

    // Calculate tip amount
    const tipAmount = useMemo(() => {
        if (noTip) return 0;
        if (customTip && !selectedPercentage) {
            return Number(customTip) || 0;
        }
        if (selectedPercentage) {
            return subtotal * selectedPercentage;
        }
        return 0;
    }, [noTip, customTip, selectedPercentage, subtotal]);

    const total = subtotal + tipAmount;

    // Handlers
    const handlePercentageSelect = (percentage: number) => {
        if (noTip) return;
        Haptics.selectionAsync();
        setSelectedPercentage(percentage);
        setCustomTip(''); // Clear custom when selecting percentage
    };

    const handleCustomTipChange = (text: string) => {
        // Only allow numbers and decimal point
        const cleaned = text.replace(/[^0-9.]/g, '');
        setCustomTip(cleaned);
        if (cleaned) {
            setSelectedPercentage(null); // Clear percentage when typing custom
        }
    };

    const handleNoTipToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newNoTip = !noTip;
        setNoTip(newNoTip);
        if (newNoTip) {
            setSelectedPercentage(null);
            setCustomTip('');
        } else {
            setSelectedPercentage(0.20); // Default back to 20%
        }
    };

    const handleContinue = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Distribute tip proportionally to items
        const itemsWithTip = items.map((item: BillItem) => {
            const tipShare = subtotal > 0
                ? (item.price / subtotal) * tipAmount
                : 0;
            return {
                ...item,
                share_of_tip: Math.round(tipShare * 100) / 100 // Round to 2 decimals
            };
        });

        // Calculate user totals with tip included
        const userTotals: Record<string, number> = {};
        users.forEach(u => userTotals[u.id] = 0);

        Object.entries(assignments).forEach(([itemId, userIds]) => {
            const item = itemsWithTip.find((i: any) => i.id === itemId);
            if (item && Array.isArray(userIds) && userIds.length > 0) {
                const costPerUser = (item.price + item.share_of_tip) / userIds.length;
                userIds.forEach((userId: string) => {
                    if (userTotals[userId] !== undefined) {
                        userTotals[userId] += costPerUser;
                    }
                });
            }
        });

        // Navigate to checkout
        router.push({
            pathname: '/bill/checkout' as any,
            params: {
                billId: billId, // Pass billId so checkout can update the bill
                billData: JSON.stringify({
                    items: itemsWithTip,
                    tip: tipAmount,
                    tax: tax,
                    total: total,
                    subtotal: subtotal
                }),
                users: JSON.stringify(users),
                assignments: JSON.stringify(assignments),
                userTotals: JSON.stringify(userTotals)
            }
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 pt-2 pb-6">
                <View className="flex-row items-center mb-8">
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
                    <Text className="ml-4 text-xl font-heading font-bold text-divvit-text">Tip</Text>
                </View>

                {/* Subtotal Display */}
                <View className="bg-gray-50 p-5 rounded-3xl border border-gray-100 mb-6">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-divvit-muted font-body text-sm uppercase tracking-wider">Subtotal</Text>
                        <Text className="text-2xl font-heading font-bold text-divvit-text">
                            ${subtotal.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* No Tip Checkbox */}
                <TouchableOpacity
                    onPress={handleNoTipToggle}
                    activeOpacity={0.7}
                    className="flex-row items-center mb-6"
                >
                    <View
                        className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${noTip ? 'bg-divvit-secondary border-divvit-secondary' : 'border-gray-300'
                            }`}
                    >
                        {noTip && <Check size={14} color="white" strokeWidth={3} />}
                    </View>
                    <Text className="font-body text-base text-divvit-text">No Tip</Text>
                </TouchableOpacity>

                {/* Percentage Buttons */}
                <View
                    className="flex-row justify-between mb-6"
                    style={{ opacity: noTip ? 0.4 : 1 }}
                >
                    {TIP_PERCENTAGES.map((tip) => (
                        <TouchableOpacity
                            key={tip.value}
                            onPress={() => handlePercentageSelect(tip.value)}
                            disabled={noTip}
                            activeOpacity={0.7}
                            className={`flex-1 mx-1 py-4 rounded-2xl items-center justify-center border-2 ${selectedPercentage === tip.value && !noTip
                                ? 'bg-divvit-secondary border-divvit-secondary'
                                : 'bg-white border-gray-200'
                                }`}
                            style={{
                                shadowColor: selectedPercentage === tip.value ? '#B54CFF' : '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: selectedPercentage === tip.value ? 0.3 : 0.05,
                                shadowRadius: 8,
                                elevation: selectedPercentage === tip.value ? 5 : 1,
                            }}
                        >
                            <Text
                                className={`font-heading text-xl font-bold ${selectedPercentage === tip.value && !noTip ? 'text-white' : 'text-divvit-text'
                                    }`}
                            >
                                {tip.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Tip Input */}
                <View
                    className="mb-8"
                    style={{ opacity: noTip ? 0.4 : 1 }}
                >
                    <View
                        className={`flex-row items-center bg-gray-50 rounded-2xl px-5 py-4 border-2 ${customTip && !noTip ? 'border-divvit-secondary' : 'border-gray-100'
                            }`}
                    >
                        <Text className="text-divvit-muted font-heading text-xl mr-2">$</Text>
                        <TextInput
                            value={customTip}
                            onChangeText={handleCustomTipChange}
                            placeholder="Custom"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="decimal-pad"
                            editable={!noTip}
                            className="flex-1 font-heading text-xl text-divvit-text"
                        />
                    </View>
                </View>

                {/* Tip Amount Display */}
                <View
                    className="bg-white p-5 rounded-3xl border border-gray-100 mb-4"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}
                >
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-divvit-muted font-body text-sm">Tip Amount</Text>
                        <Text className="text-xl font-heading font-bold text-divvit-text">
                            ${tipAmount.toFixed(2)}
                        </Text>
                    </View>
                    <View className="h-px bg-gray-100 my-2" />
                    <View className="flex-row justify-between items-center">
                        <Text className="text-divvit-text font-heading font-bold text-lg">Total</Text>
                        <Text className="text-2xl font-heading font-bold text-divvit-secondary">
                            ${total.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Continue Button */}
            <View className="absolute bottom-0 left-0 right-0 px-5 pb-10 pt-4 bg-white">
                <TouchableOpacity
                    onPress={handleContinue}
                    activeOpacity={0.85}
                    className="bg-divvit-secondary py-4 px-6 rounded-2xl flex-row items-center justify-center"
                    style={{
                        shadowColor: '#B54CFF',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 16,
                        elevation: 10,
                    }}
                >
                    <Text className="text-white font-heading font-bold text-lg mr-2">
                        Continue
                    </Text>
                    <ArrowRight size={20} color="white" strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

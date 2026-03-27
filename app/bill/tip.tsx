import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';

// Import our new components
import TotalsCard from '../../components/bill/tip/TotalsCard';
import ContextCard from '../../components/bill/tip/ContextCard';
import TipSelection from '../../components/bill/tip/TipSelection';
import FinalCalculationSurface from '../../components/bill/tip/FinalCalculationSurface';

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

// Tip percentage options matching matching new design and beta tester feedback
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
    
    // Defaulting base to pre since toggle is removed in new design
    // Keeping state to avoid breaking Logic
    const [tipBase, setTipBase] = useState<'pre' | 'post'>('pre');
    const [isScannedTipActive, setIsScannedTipActive] = useState(false);

    // The base amount used for percentage tip calculations
    const tipBaseAmount = tipBase === 'pre' ? subtotal : subtotal + tax;

    // Pre-fill from scanned tip on mount, and auto-skip to checkout if tip was already on receipt
    useEffect(() => {
        if (scannedTip > 0 && subtotal > 0) {
            const tipPercentage = scannedTip / subtotal;

            // Check if it matches one of our percentage options (within 1% tolerance)
            const matchingPercentage = TIP_PERCENTAGES.find(
                (p: {value: number, label: string}) => Math.abs(p.value - tipPercentage) < 0.01
            );

            if (matchingPercentage) {
                setSelectedPercentage(matchingPercentage.value);
            } else {
                // Use custom amount
                setCustomTip(scannedTip.toFixed(2));
            }

            setIsScannedTipActive(true);

            // Auto-skip to checkout since tip was already on the receipt
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

        const totalWithTip = subtotal + tax + tipValue;

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

        Object.entries(assignments as Record<string, string[]>).forEach(([itemId, userIds]: [string, string[]]) => {
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
            return tipBaseAmount * selectedPercentage;
        }
        return 0;
    }, [noTip, customTip, selectedPercentage, tipBaseAmount]);

    // TOTAL FIX: Include tax in the grand total
    const total = subtotal + tax + tipAmount;

    // Handlers
    const handlePercentageSelect = (percentage: number) => {
        if (noTip) return;
        Haptics.selectionAsync();
        setSelectedPercentage(percentage);
        setCustomTip(''); // Clear custom when selecting percentage
        setIsScannedTipActive(false); // User manually chose, clear scanned badge
    };

    const handleCustomTipChange = (text: string) => {
        // Only allow numbers and decimal point
        const cleaned = text.replace(/[^0-9.]/g, '');
        setCustomTip(cleaned);
        if (cleaned) {
            setSelectedPercentage(null); // Clear percentage when typing custom
        }
        setIsScannedTipActive(false); // User manually typed, clear scanned badge
    };

    const handleNoTipToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newNoTip = !noTip;
        setNoTip(newNoTip);
        if (newNoTip) {
            setSelectedPercentage(null);
            setCustomTip('');
            setIsScannedTipActive(false);
        } else {
            setSelectedPercentage(0.18); // Default back to 18% as per design
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
                share_of_tip: Math.round(tipShare * 100) / 100
            };
        });

        // Calculate user totals with tip included
        const userTotals: Record<string, number> = {};
        users.forEach(u => userTotals[u.id] = 0);

        Object.entries(assignments as Record<string, string[]>).forEach(([itemId, userIds]: [string, string[]]) => {
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
                billId: billId,
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

    // Determine tip label for FinalCalculationSurface
    let tipLabel = noTip ? 'None' : 'Custom';
    if (selectedPercentage) {
        tipLabel = `${(selectedPercentage * 100).toFixed(0)}%`;
    } else if (isScannedTipActive && !selectedPercentage && customTip) {
        tipLabel = 'From receipt';
    }

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 h-16 w-full z-50">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full hover:bg-primary-container/10"
                >
                    <ArrowLeft color="#6346cd" size={24} />
                </TouchableOpacity>
                <Text className="font-heading font-extrabold tracking-tighter text-2xl text-primary">Divvit</Text>
                
                {/* Current User Avatar Placeholder */}
                <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container border-2 border-primary/20">
                     <View className="w-full h-full bg-primary/10 items-center justify-center">
                         <Text className="text-primary font-bold text-xs font-heading">Me</Text>
                     </View>
                </View>
            </View>

            <ScrollView 
                className="flex-1 px-6 mx-auto w-full max-w-2xl"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Editorial Header */}
                <View className="mb-10">
                    <Text className="text-[11px] font-heading font-bold uppercase tracking-widest text-primary mb-2">Final Review</Text>
                    <Text className="text-3xl font-heading font-extrabold tracking-tight text-on-surface">Payment Summary</Text>
                    <Text className="text-on-surface-variant font-body mt-2">Review your split and choose a tip to complete the transaction.</Text>
                </View>

                {/* Bento Layout */}
                <View className="flex-col md:flex-row mb-3">
                    <TotalsCard 
                        subtotal={subtotal} 
                        tax={tax} 
                        dueNow={subtotal + tax} 
                    />
                    <ContextCard 
                        restaurantName="Local Restaurant" // Handled properly on backend generally but visually satisfying here
                        contextDescription="Bill Split" 
                        users={users} 
                    />
                </View>

                {/* No Tip / Settings Toggle */}
                <View className="flex-row items-center justify-between mb-2 px-2">
                    <TouchableOpacity onPress={handleNoTipToggle} className="flex-row items-center">
                        <View className={`w-5 h-5 rounded border-2 items-center justify-center mr-2 ${noTip ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                           {noTip && <View className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </View>
                        <Text className="text-sm font-medium text-on-surface">No Tip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTipBase(tipBase === 'pre' ? 'post' : 'pre')} disabled={noTip} className="flex-row items-center">
                         <Text className="text-xs text-on-surface-variant opacity-60">
                             Base: {tipBase === 'pre' ? 'Pre-tax' : 'Post-tax'}
                         </Text>
                    </TouchableOpacity>
                </View>

                <TipSelection
                    tipBaseAmount={tipBaseAmount}
                    selectedPercentage={selectedPercentage}
                    customTip={customTip}
                    noTip={noTip}
                    onSelectPercentage={handlePercentageSelect}
                    onCustomChange={handleCustomTipChange}
                    isScannedTipActive={isScannedTipActive}
                    tipPercentages={TIP_PERCENTAGES}
                />

                <FinalCalculationSurface 
                    tipLabel={tipLabel}
                    tipAmount={tipAmount}
                    total={total}
                    onContinue={handleContinue}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

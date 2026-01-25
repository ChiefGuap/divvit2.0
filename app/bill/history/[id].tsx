import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, SlideInUp, SlideInDown } from 'react-native-reanimated';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Receipt } from 'lucide-react-native';

// --- Types ---
type User = {
    id: string;
    name: string;
    avatar?: string;
    color: string;
    initials: string;
};

type BillItem = {
    id: string;
    name: string;
    price: number;
    share_of_tax?: number;
    share_of_tip?: number;
};

type BillData = {
    id: string;
    host_id: string;
    total_amount: number;
    details: {
        items: BillItem[];
        tax: number;
        tip: number;
        subtotal: number;
        users: User[];
        assignments: Record<string, string[]>;
        userTotals: Record<string, number>;
        paidStatus: string[];
        closedAt: string;
    };
    created_at: string;
};

// --- Helper Functions ---
const formatFullDate = (dateString: string): string => {
    const d = new Date(dateString);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${hours % 12 || 12}:${minutes} ${ampm}`;
};

// Valid participant colors - used to validate stored colors
const VALID_COLORS = [
    '#B54CFF', // Purple (primary)
    '#FF4C4C', // Red
    '#4CFFB5', // Mint
    '#FFB54C', // Orange
    '#4CB5FF', // Blue
    '#FF69B4', // Pink
    '#00D9FF', // Cyan
    '#9B59B6', // Amethyst
];

const getValidColor = (color: string, index: number): string => {
    // Check if color is in the valid palette
    if (VALID_COLORS.includes(color?.toUpperCase()) || VALID_COLORS.includes(color)) {
        return color;
    }
    // Fallback to cycling through valid colors based on index
    return VALID_COLORS[index % VALID_COLORS.length];
};

// --- User Row Component ---
const UserRow = ({
    user,
    amount,
    index,
}: {
    user: User;
    amount: number;
    index: number;
}) => (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
        <View
            className="mx-0 mb-0 overflow-hidden"
            style={{
                backgroundColor: getValidColor(user.color, index),
            }}
        >
            <View className="flex-row items-center justify-between px-5 py-5">
                {/* Left: Name */}
                <Text className="font-heading text-xl font-bold text-black flex-1" numberOfLines={1}>
                    {user.name}
                </Text>

                {/* Center: Amount */}
                <View className="items-end mr-4">
                    <Text className="text-black/60 font-body text-xs uppercase tracking-wider">
                        PAID
                    </Text>
                    <Text className="font-heading text-xl font-bold text-black">
                        ${amount.toFixed(2)}
                    </Text>
                </View>

                {/* Right: Paid Badge */}
                <View className="px-4 py-2 rounded-xl items-center justify-center bg-[#22C55E]">
                    <View className="flex-row items-center">
                        <Text className="font-heading font-bold text-white text-sm mr-1">PAID</Text>
                        <Check size={14} color="white" strokeWidth={3} />
                    </View>
                </View>
            </View>
        </View>
    </Animated.View>
);

// --- Item Row Component ---
const ItemRow = ({ item, index }: { item: BillItem; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <View className="flex-row justify-between items-center py-3 px-4 border-b border-white/5">
            <View className="flex-1 mr-4">
                <Text className="text-divvit-text font-body text-sm" numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
            <Text className="text-divvit-text font-heading font-semibold text-sm">
                ${item.price.toFixed(2)}
            </Text>
        </View>
    </Animated.View>
);

// --- Main Screen ---
export default function HistoryDetailScreen() {
    const router = useRouter();
    const { id, billData: billDataParam } = useLocalSearchParams<{ id: string; billData: string }>();

    const [isItemsExpanded, setIsItemsExpanded] = useState(false);

    // Parse bill data
    const bill: BillData | null = useMemo(() => {
        if (billDataParam) {
            try {
                return JSON.parse(billDataParam);
            } catch (e) {
                console.error('Failed to parse billData', e);
            }
        }
        return null;
    }, [billDataParam]);

    if (!bill) {
        return (
            <SafeAreaView className="flex-1 bg-divvit-dark items-center justify-center">
                <Stack.Screen options={{ headerShown: false }} />
                <Text className="text-divvit-muted font-body">Bill not found.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 px-6 py-2 rounded-xl bg-divvit-card border border-white/10"
                >
                    <Text className="text-divvit-text font-heading">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { details, total_amount, created_at } = bill;
    const { items, users, userTotals } = details;
    // Provide defaults for tax and tip in case they're undefined (older bills)
    const tax = details.tax ?? 0;
    const tip = details.tip ?? 0;

    const handleToggleItems = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsItemsExpanded(!isItemsExpanded);
    };

    return (
        <SafeAreaView className="flex-1 bg-divvit-dark" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 pt-2 pb-4">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 -ml-2 rounded-full border border-white/10 bg-divvit-card"
                    >
                        <ArrowLeft color="white" size={20} />
                    </TouchableOpacity>
                    <Text className="ml-4 text-xl font-heading font-bold text-divvit-text">
                        Bill Summary
                    </Text>
                </View>
            </View>

            {/* Bill Meta Info */}
            <View className="px-5 mb-4">
                <View className="bg-divvit-card p-4 rounded-2xl border border-white/5">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-divvit-muted font-body text-xs uppercase tracking-wider">
                            Date
                        </Text>
                        <Text className="text-divvit-text font-body text-sm">
                            {formatFullDate(created_at)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-divvit-muted font-body text-xs uppercase tracking-wider">
                            Total
                        </Text>
                        <Text className="font-heading font-bold text-lg text-divvit-text">
                            ${total_amount.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* User Payment Rows */}
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Users Section Header */}
                <View className="px-5 mb-2">
                    <Text className="text-divvit-muted font-body text-xs uppercase tracking-wider">
                        Who Paid What
                    </Text>
                </View>

                {/* User Rows */}
                {users.map((user, index) => {
                    const amount = userTotals[user.id] || 0;
                    return (
                        <UserRow
                            key={user.id}
                            user={user}
                            amount={amount}
                            index={index}
                        />
                    );
                })}

                {/* Spacer */}
                <View className="h-6" />

                {/* Items Accordion */}
                <View className="mx-5">
                    <TouchableOpacity
                        onPress={handleToggleItems}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 rounded-2xl bg-divvit-card border border-white/10"
                    >
                        <View className="flex-row items-center">
                            <Receipt size={18} color="#888888" />
                            <Text className="ml-3 text-divvit-text font-heading font-semibold">
                                View Items
                            </Text>
                            <View className="ml-2 px-2 py-0.5 rounded-full bg-white/10">
                                <Text className="text-divvit-muted font-body text-xs">
                                    {items.length}
                                </Text>
                            </View>
                        </View>
                        {isItemsExpanded ? (
                            <ChevronUp size={20} color="#888888" />
                        ) : (
                            <ChevronDown size={20} color="#888888" />
                        )}
                    </TouchableOpacity>

                    {/* Expanded Items List */}
                    {isItemsExpanded && (
                        <Animated.View
                            entering={SlideInDown.springify()}
                            className="mt-2 rounded-2xl bg-divvit-card border border-white/10 overflow-hidden"
                        >
                            {items.map((item, index) => (
                                <ItemRow key={item.id || index} item={item} index={index} />
                            ))}

                            {/* Tax & Tip */}
                            <View className="px-4 py-3 bg-divvit-dark/50">
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-divvit-muted font-body text-sm">Tax</Text>
                                    <Text className="text-divvit-muted font-body text-sm">
                                        ${tax.toFixed(2)}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-divvit-muted font-body text-sm">Tip</Text>
                                    <Text className="text-divvit-muted font-body text-sm">
                                        ${tip.toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            {/* Total */}
                            <View className="flex-row justify-between px-4 py-3 border-t border-white/10">
                                <Text className="text-divvit-text font-heading font-bold">Total</Text>
                                <Text className="font-heading font-bold text-divvit-text">
                                    ${total_amount.toFixed(2)}
                                </Text>
                            </View>
                        </Animated.View>
                    )}
                </View>

                {/* Bottom spacer */}
                <View className="h-10" />
            </ScrollView>
        </SafeAreaView>
    );
}

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { ArrowLeft, Calendar, CheckCircle, Clock, Receipt, ChevronDown, ChevronUp, Bell } from 'lucide-react-native';

// --- Types ---
type User = {
    id: string;
    name: string;
    color: string;
    initials: string;
};

type BillItem = {
    id: string;
    name: string;
    price: number;
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

// --- Helpers ---
const formatShortDate = (dateString: string): string => {
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// --- Person Row ---
const PersonRow = ({
    user,
    amount,
    isSettled,
    isHost,
    index,
}: {
    user: User;
    amount: number;
    isSettled: boolean;
    isHost: boolean;
    index: number;
}) => {
    const subtitle = isHost ? 'Paid for everyone' : isSettled ? 'Paid back' : 'Owes';

    return (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
            <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                shadowColor: '#141b2b',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
                borderWidth: 1,
                borderColor: 'rgba(202,196,214,0.15)',
            }}>
                {/* Left: avatar + name + subtitle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                    <View style={{ position: 'relative' }}>
                        <View style={{
                            width: 48, height: 48, borderRadius: 24,
                            backgroundColor: user.color || '#6346cd',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Text style={{ fontWeight: '700', color: '#ffffff', fontSize: 16 }}>
                                {user.initials}
                            </Text>
                        </View>
                        {/* Status dot */}
                        <View style={{
                            position: 'absolute', bottom: -1, right: -1,
                            width: 16, height: 16, borderRadius: 8,
                            backgroundColor: isSettled ? '#22c55e' : '#f59e0b',
                            borderWidth: 2, borderColor: '#f9f9ff',
                            alignItems: 'center', justifyContent: 'center',
                            overflow: 'visible',
                        }}>
                            {isSettled
                                ? <CheckCircle size={8} color="#ffffff" />
                                : <Clock size={8} color="#ffffff" />
                            }
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: '#141b2b', fontSize: 14 }}>{user.name}</Text>
                        <Text style={{ fontSize: 12, color: '#484554', fontWeight: '500', marginTop: 2 }}>{subtitle}</Text>
                    </View>
                </View>

                {/* Right: amount + pill */}
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{
                        fontWeight: '800', fontSize: 15,
                        color: isSettled ? '#141b2b' : '#4b29b4',
                    }}>
                        ${amount.toFixed(2)}
                    </Text>
                    <View style={{
                        marginTop: 4, paddingHorizontal: 8, paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: isSettled ? '#dcfce7' : '#fef3c7',
                    }}>
                        <Text style={{
                            fontSize: 9, fontWeight: '800', letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            color: isSettled ? '#166534' : '#92400e',
                        }}>
                            {isSettled ? 'Settled' : 'Pending'}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

// --- Main Screen ---
export default function HistoryDetailScreen() {
    const router = useRouter();
    const { id, billData: billDataParam } = useLocalSearchParams<{ id: string; billData: string }>();
    const [isItemsExpanded, setIsItemsExpanded] = useState(false);

    const bill: BillData | null = useMemo(() => {
        if (billDataParam) {
            try { return JSON.parse(billDataParam); }
            catch (e) { console.error('Failed to parse billData', e); }
        }
        return null;
    }, [billDataParam]);

    if (!bill) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff', alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: '#484554', fontWeight: '500' }}>Bill not found.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#f1f3ff', borderRadius: 12 }}
                >
                    <Text style={{ color: '#4b29b4', fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { details, total_amount, created_at, host_id } = bill;
    const { items = [], users = [], userTotals = {}, paidStatus = [], tax = 0, tip = 0 } = details || {};

    // Settlement tracking
    const settledIds = new Set([host_id, ...paidStatus]);
    const settledPercent = users.length > 0 ? Math.round((settledIds.size / users.length) * 100) : 100;
    const pendingUsers = users.filter(u => !settledIds.has(u.id));

    const handleToggleItems = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsItemsExpanded(prev => !prev);
    };

    const handleNudge = (name: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Nudge sent!', `${name} has been reminded to pay their share.`);
    };

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
                    <ArrowLeft size={20} color="#4b29b4" />
                </TouchableOpacity>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#4b29b4', letterSpacing: -0.5 }}>
                    Divvit
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 }}
            >
                {/* Section 1 — Hero Card */}
                <LinearGradient
                    colors={['#6346cd', '#4b29b4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        borderRadius: 24,
                        padding: 28,
                        marginBottom: 24,
                        overflow: 'hidden',
                    }}
                >
                    {/* Decorative circle */}
                    <View style={{
                        position: 'absolute', top: -40, right: -40,
                        width: 160, height: 160, borderRadius: 80,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                    }} />
                    <Text style={{
                        fontSize: 11, fontWeight: '800',
                        color: 'rgba(255,255,255,0.7)',
                        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
                    }}>
                        Bill Summary
                    </Text>
                    <Text style={{ fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: -1, marginBottom: 16 }}>
                        ${total_amount.toFixed(2)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                                {formatShortDate(created_at)}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                                {settledPercent}% Settled
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Section 2 — Who Paid What */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4,
                    }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#141b2b', letterSpacing: -0.3 }}>
                            Who Paid What
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#4b29b4', letterSpacing: 2, textTransform: 'uppercase' }}>
                            {users.length} {users.length === 1 ? 'Person' : 'People'}
                        </Text>
                    </View>

                    {users.map((user, index) => {
                        const amount = userTotals[user.id] || 0;
                        const isHost = user.id === host_id;
                        const isSettled = settledIds.has(user.id);
                        return (
                            <PersonRow
                                key={user.id}
                                user={user}
                                amount={amount}
                                isSettled={isSettled}
                                isHost={isHost}
                                index={index}
                            />
                        );
                    })}
                </View>

                {/* Section 3 — View Receipt Items */}
                <View style={{
                    backgroundColor: '#f1f3ff',
                    borderRadius: 20,
                    overflow: 'hidden',
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(202,196,214,0.2)',
                }}>
                    <TouchableOpacity
                        onPress={handleToggleItems}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between', padding: 18,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Receipt size={20} color="#4b29b4" />
                            <Text style={{ color: '#4b29b4', fontWeight: '700', fontSize: 15 }}>
                                View Receipt Items
                            </Text>
                        </View>
                        {isItemsExpanded
                            ? <ChevronUp size={20} color="#484554" />
                            : <ChevronDown size={20} color="#484554" />
                        }
                    </TouchableOpacity>

                    {isItemsExpanded && (
                        <Animated.View entering={SlideInDown.springify()}>
                            <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
                                {items.map((item, idx) => (
                                    <View key={item.id || String(idx)} style={{
                                        flexDirection: 'row', justifyContent: 'space-between',
                                        alignItems: 'center', paddingVertical: 10,
                                        borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                                        borderBottomColor: 'rgba(202,196,214,0.3)',
                                    }}>
                                        <Text style={{ color: '#484554', fontSize: 14, fontWeight: '500', flex: 1, marginRight: 12 }}>
                                            {item.name}
                                        </Text>
                                        <Text style={{ color: '#141b2b', fontWeight: '700', fontSize: 14 }}>
                                            ${item.price.toFixed(2)}
                                        </Text>
                                    </View>
                                ))}
                                {tax > 0 && (
                                    <View style={{
                                        flexDirection: 'row', justifyContent: 'space-between',
                                        paddingVertical: 10,
                                        borderTopWidth: items.length > 0 ? 1 : 0,
                                        borderTopColor: 'rgba(202,196,214,0.3)',
                                        marginTop: items.length > 0 ? 4 : 0,
                                    }}>
                                        <Text style={{ color: '#484554', fontSize: 14, fontWeight: '500' }}>Tax</Text>
                                        <Text style={{ color: '#141b2b', fontWeight: '700', fontSize: 14 }}>${tax.toFixed(2)}</Text>
                                    </View>
                                )}
                                {tip > 0 && (
                                    <View style={{
                                        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
                                    }}>
                                        <Text style={{ color: '#484554', fontSize: 14, fontWeight: '500' }}>Service Charge</Text>
                                        <Text style={{ color: '#141b2b', fontWeight: '700', fontSize: 14 }}>${tip.toFixed(2)}</Text>
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                    )}
                </View>

                {/* Section 4 — Nudge Banner (only when pending users exist) */}
                {pendingUsers.length > 0 && (
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: '#e6deff',
                        borderRadius: 20, padding: 16,
                        borderWidth: 1, borderColor: '#cbbefc',
                    }}>
                        <View style={{
                            width: 44, height: 44, borderRadius: 12,
                            backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#141b2b', shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
                        }}>
                            <Bell size={20} color="#4b29b4" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1d1245', marginBottom: 2 }}>
                                Pending payments
                            </Text>
                            <Text style={{ fontSize: 12, color: '#493f73', fontWeight: '500' }}>
                                {pendingUsers[0].name} hasn't responded yet.
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleNudge(pendingUsers[0].name)}
                            activeOpacity={0.8}
                            style={{
                                backgroundColor: '#4b29b4', paddingHorizontal: 16,
                                paddingVertical: 8, borderRadius: 999,
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>Nudge</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Share,
    Dimensions,
    ViewToken,
} from 'react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Utensils, Share2, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import DivvitHeader from '@/components/DivvitHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Types ---
type User = { id: string; name: string; color: string; initials: string; };
type BillItem = { id: string; name: string; price: number; };
type Bill = {
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
const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} • ${h12}:${mins} ${ampm}`;
};

const getBillSettled = (bill: Bill): boolean => {
    const { users = [], paidStatus = [] } = bill.details || {};
    return users.length > 0 && paidStatus.length >= users.length;
};

const getSplitType = (bill: Bill): string => {
    const { assignments = {} } = bill.details || {};
    const hasItemized = Object.values(assignments).some(ids => ids && ids.length > 0);
    return hasItemized ? 'ITEMIZED' : 'EQUAL SPLIT';
};

// --- Receipt Card ---
const ReceiptCard = ({ bill, onShare }: { bill: Bill; onShare: () => void }) => {
    const { details, created_at, total_amount, host_id } = bill;
    const { items = [], tax = 0, tip = 0, subtotal = 0, users = [], userTotals = {}, paidStatus = [] } = details || {};
    const settled = getBillSettled(bill);
    const splitType = getSplitType(bill);
    const dateStr = formatDate(created_at);
    const computedSubtotal = subtotal || items.reduce((acc, i) => acc + i.price, 0);

    return (
        <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Main Receipt Card */}
            <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 32,
                padding: 32,
                shadowColor: '#141b2b',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.06,
                shadowRadius: 32,
                elevation: 4,
                marginBottom: 16,
            }}>
                {/* A) Restaurant Header */}
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <View style={{
                        width: 64, height: 64, backgroundColor: '#6346cd',
                        borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16,
                    }}>
                        <Utensils size={32} color="#ffffff" />
                    </View>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#141b2b', letterSpacing: -0.5, marginBottom: 4 }}>
                        Shared Bill
                    </Text>
                    <Text style={{ fontSize: 14, color: '#484554', fontWeight: '500', marginBottom: 16 }}>
                        {dateStr}
                    </Text>
                    <View style={{
                        paddingHorizontal: 16, paddingVertical: 6,
                        backgroundColor: settled ? '#dcfce7' : '#fef3c7',
                        borderRadius: 999,
                    }}>
                        <Text style={{
                            fontSize: 10, fontWeight: '800', letterSpacing: 2,
                            textTransform: 'uppercase',
                            color: settled ? '#166534' : '#92400e',
                        }}>
                            {settled ? 'Settled' : 'Pending'}
                        </Text>
                    </View>
                </View>

                {/* B) Receipt Summary */}
                <View>
                    {/* Section label */}
                    <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(202,196,214,0.4)', paddingBottom: 8, marginBottom: 20 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#484554', letterSpacing: 2, textTransform: 'uppercase' }}>
                            Receipt Summary
                        </Text>
                    </View>

                    {/* Line items */}
                    {items.map((item, idx) => (
                        <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: idx < items.length - 1 ? 16 : 24 }}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={{ fontWeight: '700', color: '#141b2b', fontSize: 14 }}>{item.name || 'Item'}</Text>
                                <Text style={{ fontSize: 12, color: '#484554', marginTop: 2 }}>1 × ${item.price.toFixed(2)}</Text>
                            </View>
                            <Text style={{ fontWeight: '700', color: '#141b2b', fontSize: 14 }}>${item.price.toFixed(2)}</Text>
                        </View>
                    ))}

                    {/* Dashed divider */}
                    <View style={{ height: 1, borderWidth: 1, borderColor: '#cac4d6', borderStyle: 'dashed', marginBottom: 20 }} />

                    {/* Totals */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#484554', fontWeight: '500', fontSize: 14 }}>Subtotal</Text>
                        <Text style={{ color: '#484554', fontWeight: '700', fontSize: 14 }}>${computedSubtotal.toFixed(2)}</Text>
                    </View>
                    {tip > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ color: '#484554', fontWeight: '500', fontSize: 14 }}>Service Charge</Text>
                            <Text style={{ color: '#484554', fontWeight: '700', fontSize: 14 }}>${tip.toFixed(2)}</Text>
                        </View>
                    )}
                    {tax > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ color: '#484554', fontWeight: '500', fontSize: 14 }}>Tax</Text>
                            <Text style={{ color: '#484554', fontWeight: '700', fontSize: 14 }}>${tax.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#141b2b' }}>Total</Text>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: '#4b29b4' }}>${total_amount.toFixed(2)}</Text>
                    </View>
                </View>
            </View>

            {/* C) The Split Section */}
            <View style={{
                backgroundColor: 'rgba(75, 41, 180, 0.05)',
                borderRadius: 32,
                padding: 24,
                borderWidth: 1,
                borderColor: 'rgba(75, 41, 180, 0.1)',
                marginBottom: 16,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#4b29b4', letterSpacing: -0.3 }}>The Split</Text>
                    <View style={{ backgroundColor: '#4b29b4', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                        <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                            {splitType}
                        </Text>
                    </View>
                </View>

                {/* Person rows */}
                {users.map((u, idx) => {
                    const amount = userTotals[u.id] || 0;
                    const isHost = host_id === u.id;
                    const isPaid = paidStatus.includes(u.id);
                    const statusLabel = isHost ? 'PAID' : isPaid ? 'REIMBURSED' : 'OWES';
                    const done = isHost || isPaid;

                    return (
                        <View key={u.id} style={{
                            backgroundColor: '#ffffff',
                            padding: 16,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            shadowColor: '#141b2b',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 1,
                            borderWidth: 1,
                            borderColor: 'rgba(75, 41, 180, 0.05)',
                            marginBottom: idx < users.length - 1 ? 12 : 0,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <View style={{
                                    width: 48, height: 48, borderRadius: 24,
                                    backgroundColor: u.color || '#6346cd',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: 'rgba(75,41,180,0.2)',
                                }}>
                                    <Text style={{ fontWeight: '700', color: '#ffffff', fontSize: 16 }}>
                                        {u.initials}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontWeight: '800', color: '#141b2b', fontSize: 14 }}>{u.name}</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#484554', marginTop: 2 }}>
                                        {statusLabel}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontWeight: '900', color: '#4b29b4', fontSize: 15 }}>
                                    ${amount.toFixed(2)}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                                    <CheckCircle size={12} color={done ? '#16a34a' : '#d97706'} />
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: done ? '#16a34a' : '#d97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {done ? 'Done' : 'Pending'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {/* D) Share Button */}
                <TouchableOpacity
                    onPress={onShare}
                    activeOpacity={0.85}
                    style={{
                        marginTop: 20,
                        backgroundColor: '#6346cd',
                        borderRadius: 999,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        shadowColor: '#4b29b4',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 16,
                        elevation: 4,
                    }}
                >
                    <Share2 size={18} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Share Receipt</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// --- Dots Indicator ---
const DotsIndicator = ({ count, activeIndex }: { count: number; activeIndex: number }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 6 }}>
        {Array.from({ length: count }).map((_, i) => (
            <View key={i} style={{
                width: i === activeIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? '#4b29b4' : '#cac4d6',
            }} />
        ))}
    </View>
);

// --- Empty State ---
const EmptyState = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: '#f1f3ff', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, borderWidth: 1, borderColor: '#dce2f7',
        }}>
            <Utensils size={32} color="#9CA3AF" />
        </View>
        <Text style={{ color: '#141b2b', fontWeight: '800', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            No receipts yet
        </Text>
        <Text style={{ color: '#484554', fontSize: 14, textAlign: 'center' }}>
            Start a new split to see it here!
        </Text>
    </View>
);

// --- Skeleton ---
const SkeletonCard = () => (
    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{
            backgroundColor: '#ffffff', borderRadius: 32, padding: 32,
            shadowColor: '#141b2b', shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.06, shadowRadius: 32, elevation: 4,
        }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#e9edff', marginBottom: 12 }} />
                <View style={{ width: 140, height: 24, backgroundColor: '#e9edff', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ width: 100, height: 14, backgroundColor: '#f1f3ff', borderRadius: 6 }} />
            </View>
            {[1, 2, 3].map(i => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ width: '60%', height: 14, backgroundColor: '#f1f3ff', borderRadius: 6 }} />
                    <View style={{ width: '20%', height: 14, backgroundColor: '#f1f3ff', borderRadius: 6 }} />
                </View>
            ))}
        </View>
    </View>
);

// --- Main Screen ---
export default function HistoryScreen() {
    const { user, session, isLoading: isAuthLoading } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleShare = useCallback(async (bill: Bill) => {
        try {
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const d = new Date(bill.created_at);
            const dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
            const total = `$${bill.total_amount.toFixed(2)}`;
            const scheme = __DEV__ ? 'divvit-dev' : 'divvit';
            await Share.share({
                message: `💸 Divvit Receipt — ${total}\n📅 ${dateStr}\n👥 Split with ${bill.details?.users?.length || 0} people\n\n🔗 ${scheme}://bill/${bill.id}`,
                title: `Divvit Receipt — ${total}`,
            });
        } catch (err) {
            console.error('Share error:', err);
        }
    }, []);

    const fetchBills = useCallback(async () => {
        if (isAuthLoading) return;
        if (!user || !session) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            const response = await fetch(
                `${supabaseUrl}/rest/v1/bills?host_id=eq.${user.id}&status=in.(settled,completed,closed)&select=*&order=created_at.desc`,
                {
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );
            if (!response.ok) { console.error('Error fetching bills:', response.status); return; }
            const data = await response.json();
            setBills(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, session, isAuthLoading]);

    useEffect(() => { fetchBills(); }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            Haptics.selectionAsync();
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const renderItem = useCallback(({ item }: { item: Bill }) => (
        <ReceiptCard bill={item} onShare={() => handleShare(item)} />
    ), [handleShare]);

    const keyExtractor = useCallback((item: Bill) => item.id, []);

    if (isAuthLoading || isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top']}>
                <DivvitHeader />
                <SkeletonCard />
            </SafeAreaView>
        );
    }

    if (!session) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff', alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
                <Text style={{ color: '#484554' }}>Redirecting...</Text>
            </SafeAreaView>
        );
    }

    if (bills.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top']}>
                <DivvitHeader />
                <EmptyState />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top']}>
            <DivvitHeader />
            <FlatList
                ref={flatListRef}
                data={bills}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                style={{ flex: 1 }}
            />
            {bills.length > 1 && <DotsIndicator count={bills.length} activeIndex={activeIndex} />}
        </SafeAreaView>
    );
}

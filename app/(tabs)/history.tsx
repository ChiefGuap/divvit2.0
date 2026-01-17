import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    ScrollView,
    Dimensions,
    RefreshControl,
    ViewToken,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Clock, Receipt, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { DigitalReceipt, CARD_WIDTH, CARD_HEIGHT } from '../../components/DigitalReceipt';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.55;

// --- Types ---
type User = {
    id: string;
    name: string;
    color: string;
    initials: string;
};

type Bill = {
    id: string;
    host_id: string;
    total_amount: number;
    details: {
        items: Array<{ id: string; name: string; price: number }>;
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
const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
};

// --- Animated Pagination Dots Component ---
const PaginationDots = ({ count, activeIndex }: { count: number; activeIndex: number }) => {
    const visibleCount = Math.min(count, 5);

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12 }}>
            {Array.from({ length: visibleCount }).map((_, index) => {
                const isActive = index === activeIndex;

                return (
                    <View
                        key={index}
                        style={{
                            width: isActive ? 20 : 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: isActive ? '#B54CFF' : '#E5E7EB',
                            marginHorizontal: 4,
                        }}
                    />
                );
            })}
            {count > 5 && (
                <Text style={{ color: '#9CA3AF', fontSize: 10, marginLeft: 4 }}>+{count - 5}</Text>
            )}
        </View>
    );
};

// --- Skeleton Loader ---
const SkeletonReceipt = () => (
    <View
        style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT * 0.8,
            marginHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - 10,
            backgroundColor: '#F3F4F6',
            borderRadius: 8,
        }}
    >
        <View style={{ padding: 20 }}>
            <View style={{ height: 20, width: '50%', backgroundColor: '#E5E7EB', borderRadius: 4, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ height: 12, width: '40%', backgroundColor: '#E5E7EB', borderRadius: 4, alignSelf: 'center', marginBottom: 8 }} />
            <View style={{ height: 12, width: '30%', backgroundColor: '#E5E7EB', borderRadius: 4, alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 }} />
            <View style={{ height: 14, width: '80%', backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 8 }} />
            <View style={{ height: 14, width: '60%', backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 24 }} />
            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ height: 24, width: '30%', backgroundColor: '#E5E7EB', borderRadius: 4 }} />
                <View style={{ height: 24, width: '40%', backgroundColor: '#E5E7EB', borderRadius: 4 }} />
            </View>
        </View>
    </View>
);

const SkeletonBriefing = () => (
    <View style={{ padding: 20 }}>
        <View style={{ height: 24, width: '50%', backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {[1, 2, 3].map(i => (
                <View key={i} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', marginRight: 12 }} />
            ))}
        </View>
        <View style={{ height: 16, width: '80%', backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ height: 16, width: '60%', backgroundColor: '#E5E7EB', borderRadius: 4 }} />
    </View>
);

// --- User Avatar Component ---
const UserAvatar = ({ user, amount }: { user: User; amount: number }) => (
    <View style={{ alignItems: 'center', marginRight: 16 }}>
        <View
            style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: user.color,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(0,0,0,0.1)',
            }}
        >
            <Text style={{ fontWeight: 'bold', color: '#000', fontSize: 14 }}>
                {user.initials}
            </Text>
        </View>
        <Text style={{ color: '#6B7280', fontSize: 10, marginTop: 4 }}>
            ${amount.toFixed(2)}
        </Text>
    </View>
);

// --- Empty State ---
const EmptyState = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <View
            style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB',
            }}
        >
            <Receipt size={32} color="#9CA3AF" />
        </View>
        <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            No scanned bills yet.
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
            Your splitting history will appear here.
        </Text>
    </View>
);

// --- Briefing Panel ---
const BriefingPanel = ({ bill }: { bill: Bill | null }) => {
    if (!bill) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#6B7280' }}>Swipe to select a receipt</Text>
            </View>
        );
    }

    const { details, created_at } = bill;
    const { users = [], userTotals = {}, paidStatus = [] } = details || {};
    const isSettled = users.length > 0 && paidStatus.length >= users.length;
    const timeAgo = getTimeAgo(created_at);

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            <View
                key={bill.id}
                style={{ paddingHorizontal: 20, paddingTop: 16 }}
            >
                {/* Status Badge & Time */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            backgroundColor: isSettled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                        }}
                    >
                        {isSettled ? (
                            <CheckCircle size={14} color="#22C55E" />
                        ) : (
                            <AlertCircle size={14} color="#F97316" />
                        )}
                        <Text
                            style={{
                                marginLeft: 6,
                                fontWeight: '600',
                                fontSize: 12,
                                color: isSettled ? '#22C55E' : '#F97316',
                            }}
                        >
                            {isSettled ? 'Settled' : 'Pending'}
                        </Text>
                    </View>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{timeAgo}</Text>
                </View>

                {/* The Split - User Avatars */}
                <Text style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    The Split
                </Text>
                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                    {users.slice(0, 5).map(user => (
                        <UserAvatar
                            key={user.id}
                            user={user}
                            amount={userTotals[user.id] || 0}
                        />
                    ))}
                    {users.length > 5 && (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: '#E5E7EB',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: '#111827', fontSize: 12 }}>+{users.length - 5}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Activity Feed */}
                <Text style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Activity
                </Text>
                <View
                    style={{
                        backgroundColor: '#F9FAFB',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                    }}
                >
                    {users.length > 0 ? (
                        users.slice(0, 3).map((user, index) => {
                            const amount = userTotals[user.id] || 0;
                            const isPaid = paidStatus.includes(user.id);
                            return (
                                <View
                                    key={user.id}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 8,
                                        borderBottomWidth: index < Math.min(users.length, 3) - 1 ? 1 : 0,
                                        borderBottomColor: '#E5E7EB',
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: user.color,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 10,
                                        }}
                                    >
                                        <Text style={{ fontWeight: 'bold', color: '#000', fontSize: 10 }}>
                                            {user.initials}
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#111827', flex: 1, fontSize: 13 }}>
                                        <Text style={{ fontWeight: '600' }}>{user.name}</Text>
                                        {isPaid ? ' paid ' : ' owes '}
                                        <Text style={{ color: '#B54CFF', fontWeight: '600' }}>${amount.toFixed(2)}</Text>
                                    </Text>
                                    {isPaid && (
                                        <CheckCircle size={14} color="#22C55E" />
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <Text style={{ color: '#6B7280', fontSize: 13 }}>No activity yet</Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

// --- Main Screen ---
export default function HistoryScreen() {
    const router = useRouter();
    const { user, session, isLoading: isAuthLoading } = useAuth();
    const flatListRef = useRef<FlatList>(null);

    const [bills, setBills] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    // Get the currently active bill based on index
    const activeBill = useMemo(() => {
        return bills[activeIndex] || null;
    }, [bills, activeIndex]);

    // Fetch bills using direct fetch
    const fetchBills = useCallback(async (showRefresh = false) => {
        // CRITICAL: Don't fetch while auth is still loading
        if (isAuthLoading) {
            return;
        }

        if (!user || !session) {
            setIsLoading(false);
            return;
        }

        if (showRefresh) setRefreshing(true);
        else setIsLoading(true);

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Show bills with settled, completed, or closed status (not drafts or deleted)
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

            if (!response.ok) {
                console.error('Error fetching bills:', response.status);
                return;
            }

            const data = await response.json();
            setBills(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user, session]);

    useEffect(() => {
        fetchBills();
    }, []);

    const handleRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchBills(true);
    }, [fetchBills]);

    // Track visible items - update activeIndex when centered item changes
    // IMPORTANT: No dependencies to prevent callback recreation which breaks FlatList
    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const centeredItem = viewableItems[0];
            if (centeredItem.index !== null) {
                // Animate the dot width change
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                Haptics.selectionAsync();
                setActiveIndex(centeredItem.index);
            }
        }
    }).current;

    // CRUCIAL: Use itemVisiblePercentThreshold for proper triggering
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    // Render receipt card
    const renderReceipt = useCallback(({ item }: { item: Bill }) => (
        <DigitalReceipt
            date={item.created_at}
            total={item.total_amount}
            items={item.details?.items || []}
            tax={item.details?.tax || 0}
            tip={item.details?.tip || 0}
        />
    ), []);

    const keyExtractor = useCallback((item: Bill) => item.id, []);

    // CRITICAL: If auth is still loading, show loading skeleton
    // This prevents flash of empty state on web reload
    if (isAuthLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }} edges={['top']}>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={24} color="#B54CFF" strokeWidth={2} />
                        <Text style={{ marginLeft: 12, fontSize: 22, fontWeight: 'bold', color: '#111827' }}>
                            History
                        </Text>
                    </View>
                </View>
                <View style={{ height: CAROUSEL_HEIGHT, justifyContent: 'center' }}>
                    <SkeletonReceipt />
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                    <SkeletonBriefing />
                </View>
            </SafeAreaView>
        );
    }

    // If auth finished but no session, show loading (NavigationController will redirect)
    if (!session) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
                <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12 }}>
                    <Text style={{ color: '#6B7280' }}>Redirecting...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Data loading state
    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }} edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={24} color="#B54CFF" strokeWidth={2} />
                        <Text style={{ marginLeft: 12, fontSize: 22, fontWeight: 'bold', color: '#111827' }}>
                            History
                        </Text>
                    </View>
                </View>

                {/* Skeleton Carousel */}
                <View style={{ height: CAROUSEL_HEIGHT, justifyContent: 'center' }}>
                    <SkeletonReceipt />
                </View>

                {/* Skeleton Briefing */}
                <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                    <SkeletonBriefing />
                </View>
            </SafeAreaView>
        );
    }

    // Empty state
    if (bills.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }} edges={['top']}>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={24} color="#B54CFF" strokeWidth={2} />
                        <Text style={{ marginLeft: 12, fontSize: 22, fontWeight: 'bold', color: '#111827' }}>
                            History
                        </Text>
                    </View>
                </View>
                <EmptyState />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }} edges={['top']}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={24} color="#B54CFF" strokeWidth={2} />
                    <Text style={{ marginLeft: 12, fontSize: 22, fontWeight: 'bold', color: '#111827' }}>
                        History
                    </Text>
                    <View style={{ marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
                        <Text style={{ color: '#6B7280', fontSize: 12 }}>{bills.length} bills</Text>
                    </View>
                </View>
            </View>

            {/* Carousel Section */}
            <View style={{ height: CAROUSEL_HEIGHT }}>
                <FlatList
                    ref={flatListRef}
                    data={bills}
                    renderItem={renderReceipt}
                    keyExtractor={keyExtractor}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + 20}
                    decelerationRate="fast"
                    contentContainerStyle={{
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                    }}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#B54CFF"
                        />
                    }
                />
            </View>

            {/* Pagination Dots */}
            <PaginationDots count={bills.length} activeIndex={activeIndex} />

            {/* Briefing Panel (Bottom Section) */}
            <View
                style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    elevation: 5,
                }}
            >
                <BriefingPanel bill={activeBill} />
            </View>
        </SafeAreaView>
    );
}

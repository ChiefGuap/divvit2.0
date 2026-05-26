// Promotions page — real deals fetched from Supabase + backend scraper
// Deals refresh every 24 hours and are location-aware

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Animated, PanResponder,
  Dimensions, ScrollView, Alert, StyleSheet, Platform,
  ActivityIndicator, RefreshControl, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Tag, Star, Heart, X, Undo2, CheckCircle2,
  MapPin, WifiOff,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchDeals, forceRefreshDeals, type Deal } from '../../services/dealsService';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardsContext';
import { awardUsePromotion } from '../../services/rewardsService';
import TabHeader from '@/components/TabHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.4;
const SWIPE_THRESHOLD = 100;

const RADIUS_OPTIONS = [5, 10, 15, 25, 50]; // miles

const AVATAR_COLORS = ['#6346cd', '#4b29b4', '#6346cd', '#e5e7eb'];
const AVATAR_INITIALS = ['JM', 'KR', 'AS'];



// ─── Segmented Control ───
const SegmentedControl = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: 'swipe' | 'saved') => void }) => (
  <View style={s.segWrap}>
    {(['swipe', 'saved'] as const).map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[s.segBtn, activeTab === tab && s.segBtnActive]}
        onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
        activeOpacity={0.7}
      >
        <Text style={[s.segTxt, activeTab === tab && s.segTxtActive]}>
          {tab === 'swipe' ? 'DIVV DEALS' : 'SAVED PROMOS'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Countdown ───
const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState('04:12:45');
  useEffect(() => {
    const target = new Date();
    target.setHours(target.getHours() + 4);
    target.setMinutes(target.getMinutes() + 12);
    target.setSeconds(target.getSeconds() + 45);
    const interval = setInterval(() => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('00:00:00'); clearInterval(interval); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <View style={s.countdownRow}>
      <Text style={s.countdownLabel}>NEXT EXCLUSIVE DROP IN:  </Text>
      <Text style={s.countdownValue}>{timeLeft}</Text>
    </View>
  );
};

// ─── Card Image Placeholder ───
const CardImagePlaceholder = () => (
  <LinearGradient colors={['#6346cd', '#4b29b4']} style={s.cardImagePlaceholder}>
    <Tag size={48} color="#ffffff" />
  </LinearGradient>
);

// ─── Background Card ───
const BgCard = ({ level }: { level: number }) => {
  const configs = [
    { translateY: 48, scale: 0.88, opacity: 0.2 },
    { translateY: 32, scale: 0.92, opacity: 0.4 },
    { translateY: 16, scale: 0.96, opacity: 0.7 },
  ];
  const c = configs[level] || configs[0];
  return (
    <View style={[s.bgCard, {
      transform: [{ translateY: c.translateY }, { scale: c.scale }],
      opacity: c.opacity,
    }]} />
  );
};

// ─── Active Card Content ───
const ActiveCardContent = ({ deal }: { deal: Deal }) => {
  return (
    <View style={s.cardInner}>
      {/* Image top 2/3 */}
      <View style={s.cardImageWrap}>
        {deal.imageUrl ? (
          <Image
            source={{ uri: deal.imageUrl }}
            style={s.dealImage}
            resizeMode="cover"
            onError={() => {}}
          />
        ) : (
          <CardImagePlaceholder />
        )}
        
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{deal.badge.toUpperCase()}</Text>
        </View>
      </View>
      {/* Content bottom 1/3 */}
      <View style={s.cardContent}>
        <View style={s.cardRow1}>
          <Text style={s.restaurantName}>{deal.restaurant.toUpperCase()}</Text>
          <View style={s.dot} />
          <Text style={s.distanceTxt}>{deal.distance} away</Text>
          <View style={{ flex: 1 }} />
          <Star size={12} color="#6346cd" fill="#6346cd" />
          <Text style={s.ratingTxt}>{deal.rating}</Text>
        </View>
        <Text style={s.dealTitle}>{deal.title}</Text>
        <Text style={s.dealDesc} numberOfLines={2}>{deal.description}</Text>
        <View style={s.cardBottom}>
          <View style={s.avatarBubbles}>
            {AVATAR_INITIALS.map((init, i) => (
              <View key={i} style={[s.avatarBubble, { backgroundColor: AVATAR_COLORS[i], marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }]}>
                <Text style={s.avatarBubbleTxt}>{init}</Text>
              </View>
            ))}
          </View>
          <Text style={s.savedCount}>{deal.saves.toUpperCase()} SAVED</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Loading State ───
const LoadingState = () => (
  <View style={s.loadingWrap}>
    <View style={s.loadingCard}>
      <LinearGradient colors={['#f1f3ff', '#e5e7eb', '#f1f3ff']} style={s.loadingShimmer} />
      <View style={s.loadingContent}>
        <View style={[s.loadingLine, { width: '60%' }]} />
        <View style={[s.loadingLine, { width: '80%', marginTop: 12 }]} />
        <View style={[s.loadingLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
    <ActivityIndicator size="large" color="#6346cd" style={{ marginTop: 24 }} />
    <Text style={[s.loadingTxt, { fontFamily: 'Outfit' }]}>FINDING DEALS NEAR YOU...</Text>
  </View>
);

// ─── Error State ───
const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <View style={s.emptyWrap}>
    <View style={[s.emptyCircle, { backgroundColor: 'rgba(180,19,64,0.1)' }]}>
      <WifiOff size={48} color="#dc2626" />
    </View>
    <Text style={s.emptyTitle}>Couldn't load deals</Text>
    <Text style={s.emptySub}>Check your connection and try again.</Text>
    <TouchableOpacity style={s.emptyBtn} onPress={onRetry} activeOpacity={0.8}>
      <Text style={s.emptyBtnTxt}>TRY AGAIN</Text>
    </TouchableOpacity>
  </View>
);

// ─── Radius Filter ───
const RadiusFilter = ({ radius, setRadius }: { radius: number; setRadius: (r: number) => void }) => (
  <View style={s.radiusWrap}>
    <MapPin size={14} color="#6346cd" />
    <Text style={s.radiusLabel}>WITHIN</Text>
    {RADIUS_OPTIONS.map((r) => (
      <TouchableOpacity
        key={r}
        style={[s.radiusChip, radius === r && s.radiusChipActive]}
        onPress={() => { Haptics.selectionAsync(); setRadius(r); }}
        activeOpacity={0.7}
      >
        <Text style={[s.radiusChipTxt, radius === r && s.radiusChipTxtActive]}>{r}mi</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Swipe Deals View ───
const SwipeDealsView = ({ deals, onDealSaved, savedDeals, onDealSeen }: { deals: Deal[]; onDealSaved: (d: Deal) => void; savedDeals: Deal[]; onDealSeen?: (id: string) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const position = useRef(new Animated.ValueXY()).current;
  const currentIndexRef = useRef(0);

  // Reset card index when deals change (e.g., new scrape or radius change)
  useEffect(() => {
    setCurrentIndex(0);
    setHistory([]);
    currentIndexRef.current = 0;
  }, [deals]);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const animateOut = useCallback((direction: 'left' | 'right', cb: () => void) => {
    const toX = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, { toValue: { x: toX, y: 0 }, duration: 250, useNativeDriver: true }).start(() => {
      position.setValue({ x: 0, y: 0 });
      cb();
    });
  }, [position]);

  const handleSwipeRight = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx >= deals.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateOut('right', () => {
      onDealSaved(deals[idx]);
      onDealSeen?.(deals[idx].id);
      setHistory(prev => [...prev, idx]);
      setCurrentIndex(idx + 1);
    });
  }, [animateOut, onDealSaved, onDealSeen, deals]);

  const handleSwipeLeft = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx >= deals.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateOut('left', () => {
      onDealSeen?.(deals[idx].id);
      setHistory(prev => [...prev, idx]);
      setCurrentIndex(idx + 1);
    });
  }, [animateOut, onDealSeen, deals]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    Haptics.selectionAsync();
    const lastIdx = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentIndex(lastIdx);
  }, [history]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) handleSwipeRight();
        else if (g.dx < -SWIPE_THRESHOLD) handleSwipeLeft();
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 5 }).start();
      },
    })
  ).current;

  // No deals available
  if (deals.length === 0) return <EmptyState onGoToDeals={() => {}} isAllSwiped />;

  // All swiped → empty state
  if (currentIndex >= deals.length) return <EmptyState onGoToDeals={() => {}} isAllSwiped />;

  const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], outputRange: ['-15deg', '0deg', '15deg'] });
  const saveOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const deal = deals[currentIndex];
  const remaining = deals.length - currentIndex;

  return (
    <View style={s.swipeContainer}>
      {/* Background stack */}
      <View style={s.cardStack}>
        {remaining > 3 && <BgCard level={0} />}
        {remaining > 2 && <BgCard level={1} />}
        {remaining > 1 && <BgCard level={2} />}
        {/* Active card */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[s.activeCard, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
        >
          {/* Swipe indicators */}
          <Animated.View style={[s.swipeIndicator, s.saveIndicator, { opacity: saveOpacity }]}>
            <Text style={s.saveIndicatorTxt}>DIVV'D</Text>
          </Animated.View>
          <Animated.View style={[s.swipeIndicator, s.skipIndicator, { opacity: skipOpacity }]}>
            <Text style={s.skipIndicatorTxt}>SKIP</Text>
          </Animated.View>
          <ActiveCardContent deal={deal} />
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={s.actionRow}>
        <TouchableOpacity style={s.undoBtn} onPress={handleUndo} activeOpacity={0.7}>
          <Undo2 size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity style={s.skipBtn} onPress={handleSwipeLeft} activeOpacity={0.7}>
          <X size={28} color="#dc2626" />
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={handleSwipeRight} activeOpacity={0.7}>
          <Heart size={36} color="#ffffff" fill="#ffffff" />
        </TouchableOpacity>
      </View>

      <Text style={s.hintTxt}>SWIPE RIGHT TO SAVE, LEFT TO SKIP</Text>
    </View>
  );
};

// ─── Empty State ───
const EmptyState = ({ onGoToDeals, isAllSwiped }: { onGoToDeals: () => void; isAllSwiped?: boolean }) => (
  <View style={s.emptyWrap}>
    <View style={s.emptyCircle}>
      <CheckCircle2 size={48} color="#6346cd" />
    </View>
    <Text style={s.emptyTitle}>
      {isAllSwiped ? "You've swiped through\nall current deals." : 'No saved deals yet'}
    </Text>
    <Text style={s.emptySub}>
      {isAllSwiped ? 'Check back for more deals soon.' : 'Swipe right on deals to save them here.'}
    </Text>
    <TouchableOpacity style={s.emptyBtn} onPress={onGoToDeals} activeOpacity={0.8}>
      <Text style={s.emptyBtnTxt}>{isAllSwiped ? 'GO TO MY DEALS' : 'GO SWIPE DEALS'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Saved Promos View ───
const SavedPromosView = ({ savedDeals, setActiveTab }: { savedDeals: Deal[]; setActiveTab: (t: 'swipe' | 'saved') => void }) => {
  const { user } = useAuth();
  const rewards = useRewards();

  const handleUseDeal = async (deal: Deal) => {
    const url = deal.source || (deal as any).sourceUrl;
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (error) {
        Alert.alert(
          'Cannot Open Link',
          'Please visit the restaurant website directly.',
          [{ text: 'OK' }]
        );
      }
    }

    if (!user?.id) {
      Alert.alert(deal.title, `${deal.description}\n\nShow this screen to redeem at ${deal.restaurant}.`);
      return;
    }

    try {
      const result = await awardUsePromotion(user.id, deal.id);
      rewards.refresh().catch(() => { });

      const awarded = result?.points_awarded ?? 0;
      const tail = awarded > 0 ? `\n\n+${awarded} pts awarded!` : '';
      Alert.alert(
        deal.title,
        `${deal.description}\n\nShow this screen to redeem at ${deal.restaurant}.${tail}`,
      );
    } catch (err) {
      console.warn('[Rewards] awardUsePromotion failed:', err);
      Alert.alert(
        deal.title,
        `${deal.description}\n\nShow this screen to redeem at ${deal.restaurant}.`,
      );
    }
  };

  if (savedDeals.length === 0) return <EmptyState onGoToDeals={() => setActiveTab('swipe')} />;
  return (
    <ScrollView style={s.savedScroll} contentContainerStyle={s.savedScrollContent} showsVerticalScrollIndicator={false}>
      {savedDeals.map((deal) => (
        <View key={deal.id} style={s.savedCard}>
          {deal.imageUrl ? (
            <View style={s.savedLogoContainer}>
              <Image source={{ uri: deal.imageUrl }} style={s.savedLogoImage} resizeMode="contain" />
            </View>
          ) : (
            <LinearGradient colors={['#6346cd', '#4b29b4']} style={s.savedImg}>
              <Tag size={24} color="#ffffff" />
            </LinearGradient>
          )}
          <View style={s.savedInfo}>
            <Text style={s.savedRestaurant}>{deal.restaurant.toUpperCase()}</Text>
            <Text style={s.savedTitle}>{deal.title}</Text>
            <View style={s.savedBadgeWrap}>
              <View style={s.savedBadge}><Text style={s.savedBadgeTxt}>Saved</Text></View>
            </View>
            <TouchableOpacity onPress={() => handleUseDeal(deal)} activeOpacity={0.7}>
              <Text style={s.useNowTxt}>Use Now →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

// ─── Mock Deals ───
const MOCK_DEALS: Deal[] = [
  {
    id: '1',
    restaurant: 'Habit Burger',
    title: 'FREE Smash Burger',
    description: 'Get a complimentary classic Charburger with any purchase of a medium drink or larger.',
    distance: '0.8 miles',
    rating: 4.9,
    saves: '1.2k',
    badge: 'Limited Offer',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    pointsAwarded: 2,
    dealType: 'discount',
    source: 'https://www.habitburger.com',
  },
  {
    id: '2',
    restaurant: 'Chipotle',
    title: 'BOGO Burrito Bowl',
    description: 'Buy one burrito bowl, get one free. Valid for dine-in only.',
    distance: '1.2 miles',
    rating: 4.7,
    saves: '3.4k',
    badge: 'Today Only',
    imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&q=80',
    pointsAwarded: 2,
    dealType: 'bogo',
    source: 'https://www.chipotle.com',
  },
  {
    id: '3',
    restaurant: 'Shake Shack',
    title: '20% Off Your Order',
    description: 'Get 20% off your entire order when you pay with Divvit.',
    distance: '0.5 miles',
    rating: 4.8,
    saves: '892',
    badge: 'Exclusive',
    imageUrl: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80',
    pointsAwarded: 2,
    dealType: 'discount',
    source: 'https://www.shakeshack.com',
  },
  {
    id: '4',
    restaurant: 'Panda Express',
    title: 'Free Plate Upgrade',
    description: 'Upgrade from a 2-item to a 3-item plate for free with any entree purchase.',
    distance: '2.1 miles',
    rating: 4.5,
    saves: '5.1k',
    badge: 'Popular',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
    pointsAwarded: 2,
    dealType: 'free_item',
    source: 'https://www.pandaexpress.com',
  },
  {
    id: '5',
    restaurant: 'Starbucks',
    title: 'Free Grande Drink',
    description: 'Get a free Grande drink with any food purchase over $8.',
    distance: '0.3 miles',
    rating: 4.6,
    saves: '8.2k',
    badge: 'Hot Deal',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&q=80',
    pointsAwarded: 2,
    dealType: 'free_item',
    source: 'https://www.starbucks.com',
  },
];

// ─── Main Screen ───
export default function PromotionsScreen() {
  const rewards = useRewards();
  const userPoints = rewards.points ?? 0;

  const [activeTab, setActiveTab] = useState<'swipe' | 'saved'>('swipe');
  const [savedDeals, setSavedDeals] = useState<Deal[]>([]);
  const [seenDeals, setSeenDeals] = useState<string[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [radius, setRadius] = useState(10); // default 10 miles

  const SAVED_DEALS_KEY = 'divvit_saved_deals';
  const SEEN_DEALS_KEY = 'divvit_seen_deals';

  // ─── Load deals on mount ───
  const loadDeals = useCallback(async () => {
    try {
      setError(false);
      const fetched = await fetchDeals();
      setDeals(fetched.length > 0 ? fetched : MOCK_DEALS);
    } catch (err) {
      console.error('[Promotions] Failed to load deals:', err);
      setDeals(MOCK_DEALS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved and seen deals on mount
  useEffect(() => {
    const loadSavedAndSeen = async () => {
      try {
        const saved = await AsyncStorage.getItem(SAVED_DEALS_KEY);
        if (saved) setSavedDeals(JSON.parse(saved));
        const seen = await AsyncStorage.getItem(SEEN_DEALS_KEY);
        if (seen) setSeenDeals(JSON.parse(seen));
      } catch (error) {
        console.error('Failed to load deals from AsyncStorage:', error);
      }
    };
    loadSavedAndSeen();
    loadDeals();
  }, [loadDeals]);

  // Save whenever savedDeals changes
  useEffect(() => {
    const persistSavedDeals = async () => {
      try {
        await AsyncStorage.setItem(SAVED_DEALS_KEY, JSON.stringify(savedDeals));
      } catch (error) {
        console.error('Failed to save deals:', error);
      }
    };
    if (savedDeals.length > 0) {
      persistSavedDeals();
    }
  }, [savedDeals]);

  // Save whenever seenDeals changes:
  useEffect(() => {
    const persistSeenDeals = async () => {
      try {
        await AsyncStorage.setItem(SEEN_DEALS_KEY, JSON.stringify(seenDeals));
      } catch (error) {
        console.error('Failed to save seen deals:', error);
      }
    };
    if (seenDeals.length > 0) {
      persistSeenDeals();
    }
  }, [seenDeals]);

  // Handle saving deal
  const handleDealSaved = useCallback((deal: Deal) => {
    setSavedDeals(prev => {
      if (prev.find(d => d.id === deal.id)) return prev;
      return [...prev, deal];
    });
  }, []);

  // Handle seen/swiped deal
  const handleDealSeen = useCallback((dealId: string) => {
    setSeenDeals(prev => {
      if (prev.includes(dealId)) return prev;
      return [...prev, dealId];
    });
  }, []);

  // Filter swiped/seen deals
  const unswipedDeals = useMemo(() => {
    return deals.filter(d => !seenDeals.includes(d.id));
  }, [deals, seenDeals]);

  // ─── Pull to refresh ───
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const fresh = await forceRefreshDeals();
      setDeals(fresh.length > 0 ? fresh : MOCK_DEALS);
    } catch (err) {
      console.error('[Promotions] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ─── Render ───
  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <TabHeader points={userPoints} />
      <SegmentedControl activeTab={activeTab} setActiveTab={setActiveTab} />
      <RadiusFilter radius={radius} setRadius={setRadius} />
      <Countdown />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={loadDeals} />
      ) : activeTab === 'swipe' ? (
        <SwipeDealsView deals={unswipedDeals} onDealSaved={handleDealSaved} savedDeals={savedDeals} onDealSeen={handleDealSeen} />
      ) : (
        <SavedPromosView savedDeals={savedDeals} setActiveTab={setActiveTab} />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9f9ff', paddingBottom: 100 },

  // Header
  header: {
    height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, backgroundColor: '#f9f9ff',
    shadowColor: 'rgba(95,57,221,0.1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(95,57,221,0.1)', alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontSize: 22, fontWeight: '800', color: '#6346cd' },

  // Segmented Control
  segWrap: { flexDirection: 'row', backgroundColor: '#f1f3ff', borderRadius: 999, padding: 6, marginHorizontal: 16, marginTop: 12 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(95,57,221,0.15)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  segTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#484554' },
  segTxtActive: { color: '#6346cd' },

  // Countdown
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 8 },
  countdownLabel: { fontSize: 11, color: '#484554', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  countdownValue: { fontSize: 11, color: '#6346cd', fontWeight: '800', letterSpacing: 1.5 },

  // Card stack
  swipeContainer: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 24 },
  cardStack: { width: CARD_WIDTH, height: CARD_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  bgCard: {
    position: 'absolute', width: CARD_WIDTH, height: CARD_HEIGHT,
    backgroundColor: '#ffffff', borderRadius: 28, borderWidth: 1, borderColor: '#e5e7eb',
  },
  activeCard: {
    position: 'absolute', width: CARD_WIDTH, height: CARD_HEIGHT,
    backgroundColor: '#ffffff', borderRadius: 28, overflow: 'hidden',
    shadowColor: 'rgba(95,57,221,0.15)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 1, shadowRadius: 40, elevation: 8,
  },
  cardInner: { flex: 1 },

  // Card image
  cardImageWrap: { flex: 2, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoCardContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  cardLogoImage: {
    width: '80%',
    height: '80%',
  },
  savedLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(184, 165, 211, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    overflow: 'hidden',
  },
  savedLogoImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#6346cd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  badgeTxt: { color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },

  // Card content
  cardContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  cardRow1: { flexDirection: 'row', alignItems: 'center' },
  restaurantName: { fontSize: 13, fontWeight: '700', color: '#4b29b4', letterSpacing: 1, textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginHorizontal: 8 },
  distanceTxt: { fontSize: 12, color: '#9ca3af' },
  ratingTxt: { fontSize: 12, fontWeight: '700', color: '#6346cd', marginLeft: 4 },
  dealTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginTop: 4 },
  dealDesc: { fontSize: 14, color: '#484554', marginTop: 8, lineHeight: 20 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  avatarBubbles: { flexDirection: 'row', alignItems: 'center' },
  avatarBubble: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
  avatarBubbleTxt: { fontSize: 8, fontWeight: '700', color: '#ffffff' },
  savedCount: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' },

  // Swipe indicators
  swipeIndicator: { position: 'absolute', top: 20, zIndex: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 3 },
  saveIndicator: { left: 20, borderColor: '#6346cd', backgroundColor: '#6346cd' },
  saveIndicatorTxt: { fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: 2 },
  skipIndicator: { right: 20, borderColor: '#dc2626', backgroundColor: 'rgba(180,19,64,0.1)' },
  skipIndicatorTxt: { fontSize: 24, fontWeight: '800', color: '#dc2626', letterSpacing: 2 },

  // Action buttons
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 20 },
  undoBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  skipBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#e5e7eb',
  },
  saveBtn: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#6346cd', alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(95,57,221,0.4)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6,
  },
  hintTxt: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginTop: 16 },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(95,57,221,0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.3, lineHeight: 32, marginTop: 32 },
  emptySub: { fontSize: 16, color: '#484554', fontWeight: '500', textAlign: 'center', marginTop: 12 },
  emptyBtn: {
    marginTop: 40, width: 280, height: 56, borderRadius: 16, backgroundColor: '#6346cd',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(95,57,221,0.3)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 4,
  },
  emptyBtnTxt: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },

  // Saved promos
  savedScroll: { flex: 1 },
  savedScrollContent: { padding: 16, paddingBottom: 24 },
  savedCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', gap: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  savedImg: { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  savedInfo: { flex: 1, justifyContent: 'center' },
  savedRestaurant: { fontSize: 12, fontWeight: '700', color: '#6346cd', letterSpacing: 1, textTransform: 'uppercase' },
  savedTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  savedBadgeWrap: { flexDirection: 'row', marginTop: 6 },
  savedBadge: { backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  savedBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#22c55e' },
  useNowTxt: { fontSize: 13, fontWeight: '700', color: '#6346cd', marginTop: 6 },

  // Loading state
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingCard: {
    width: CARD_WIDTH, height: CARD_HEIGHT * 0.7, borderRadius: 28, overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(95,57,221,0.1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 4,
  },
  loadingShimmer: { flex: 2, opacity: 0.6 },
  loadingContent: { flex: 1, padding: 20, justifyContent: 'center' },
  loadingLine: {
    height: 14, borderRadius: 7, backgroundColor: '#f1f3ff',
  },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginTop: 16 },

  // Radius filter
  radiusWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 10,
  },
  radiusLabel: { fontSize: 10, fontWeight: '700', color: '#484554', letterSpacing: 1.5, marginRight: 4 },
  radiusChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#f1f3ff',
  },
  radiusChipActive: { backgroundColor: '#6346cd' },
  radiusChipTxt: { fontSize: 11, fontWeight: '700', color: '#484554' },
  radiusChipTxtActive: { color: '#ffffff' },

  dealImage: {
    width: '100%',
    height: '100%',  // fills the image container
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});

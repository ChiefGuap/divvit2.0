import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  Star,
  Lock,
  ChevronRight,
  Utensils,
  LogIn,
  Flame,
  UserPlus,
  Camera,
  Award,
  Tag,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardsContext';
import TabHeader from '@/components/TabHeader';
import {
  getPointHistory,
} from '../../services/rewardsService';
import { getNextReward, type CatalogItem } from '../../utils/rewardsMath';
import RedemptionModal from '../../components/RedemptionModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// DESIGN SYSTEM
const COLORS = {
  primary: '#6346cd',
  primaryDim: '#4b29b4',
  surface: '#f9f9ff',
  surfaceContainer: '#f1f3ff',
  surfaceContainerLow: '#f1f3ff',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#111827',
  onSurfaceVariant: '#484554',
  secondary: '#484554',
  outline: '#9ca3af',
  outlineVariant: '#e5e7eb',
  error: '#dc2626',
  success: '#16a34a',
};

const MOCK_CATALOG: CatalogItem[] = [
  {
    id: 'mock-1',
    name: '$5 Panda Express Gift Card',
    description: 'Digital gift card for Panda Express',
    points_required: 500,
    reward_type: 'gift_card',
    reward_value: '$5',
    vendor: 'Panda Express',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'mock-2',
    name: '$5 Habit Burger Gift Card',
    description: 'Valid until July 2025',
    points_required: 500,
    reward_type: 'gift_card',
    reward_value: '$5',
    vendor: 'Habit Burger',
    is_active: true,
    display_order: 2,
  },
  {
    id: 'mock-3',
    name: '$5 Chick-fil-A Gift Card',
    description: 'Digital gift card',
    points_required: 500,
    reward_type: 'gift_card',
    reward_value: '$5',
    vendor: 'Chick-fil-A',
    is_active: true,
    display_order: 3,
  },
  {
    id: 'mock-4',
    name: '$10 McDonald\'s Gift Card',
    description: 'Valid at any McDonald\'s location',
    points_required: 1000,
    reward_type: 'gift_card',
    reward_value: '$10',
    vendor: 'McDonald\'s',
    is_active: true,
    display_order: 4,
  },
  {
    id: 'mock-5',
    name: '$25 Starbucks Gift Card',
    description: 'Digital Starbucks card',
    points_required: 2500,
    reward_type: 'gift_card',
    reward_value: '$25',
    vendor: 'Starbucks',
    is_active: true,
    display_order: 5,
  },
];

export default function RewardsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const rewards = useRewards();

  const userPoints = rewards.points ?? 0;
  const rewardsCatalog = rewards.catalog;

  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [activeDotIndex, setActiveDotIndex] = useState(0);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const history = await getPointHistory(user.id, 5);
      setPointHistory(history || []);
    } catch (error) {
      console.error('[RewardsScreen] Error loading point history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const reloadAll = useCallback(async () => {
    await Promise.all([rewards.refresh(), loadHistory()]);
  }, [rewards, loadHistory]);

  // Load when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reloadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadAll();
    setRefreshing(false);
  };

  const isLoading = (rewards.points === null && rewards.isLoading) || historyLoading;

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / 216); // card width 200 + margin 16
    setActiveDotIndex(Math.min(Math.max(index, 0), 2)); // cap at 3 dots (0, 1, 2)
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      // Calculate diff in calendar days, resetting hours to 0 to compare exact dates
      const dateCopy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const nowCopy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = nowCopy.getTime() - dateCopy.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'TODAY';
      if (diffDays === 1) return 'YESTERDAY';
      return `${diffDays} DAYS AGO`;
    } catch (e) {
      return 'SOME TIME AGO';
    }
  };

  const getHistoryIconInfo = (eventType: string) => {
    switch (eventType) {
      case 'split_bill':
        return { bg: COLORS.surfaceContainer, icon: Utensils, color: COLORS.primary };
      case 'daily_login':
        return { bg: '#f0fdf4', icon: LogIn, color: COLORS.success };
      case 'streak_3_day':
      case 'streak_7_day':
        return { bg: '#fff7ed', icon: Flame, color: '#f97316' };
      case 'referral_signup':
      case 'referral_first_split':
        return { bg: '#fdf2f8', icon: UserPlus, color: '#9b3664' };
      case 'group_photo_bonus':
        return { bg: '#f0f9ff', icon: Camera, color: '#0284c7' };
      default:
        return { bg: COLORS.surfaceContainer, icon: Award, color: COLORS.primary };
    }
  };

  const getHistoryEventName = (entry: any) => {
    switch (entry.event_type) {
      case 'split_bill':
        return 'Split Bill';
      case 'daily_login':
        return 'Login Bonus';
      case 'streak_3_day':
        return '3-Day Streak! 🔥';
      case 'streak_7_day':
        return '7-Day Streak! 🔥';
      case 'group_photo_bonus':
        return 'Group Photo Bonus';
      case 'referral_signup':
        return 'Referral Bonus';
      case 'referral_first_split':
        return "Friend's First Split";
      case 'first_split_bonus':
        return 'First Split Bonus!';
      case 'redemption':
        return 'Redemption';
      default:
        return entry.description || entry.event_type || 'Points Adjustment';
    }
  };

  // Setup catalog items (fallback to mocks if empty)
  const displayCatalog = rewardsCatalog.length > 0 ? rewardsCatalog : MOCK_CATALOG;

  // Filter 3 hot rewards for horizontal scroll (typically highest order or display order)
  const hotRewards = displayCatalog.slice(0, 3);

  // Find next locked reward (shared util)
  const { nextReward, pointsLeft, progressPercent: progress } =
    getNextReward(userPoints, displayCatalog);

  if (isLoading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading rewards...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* HEADER */}
      <TabHeader points={userPoints} />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* SECTION 1 — AVAILABLE POINTS HERO CARD */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDim]}
          style={s.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={s.heroLeft}>
            <Text style={s.heroLabel}>AVAILABLE POINTS</Text>
            <View style={s.pointsRow}>
              <Text style={s.pointsText}>{userPoints}</Text>
              <Text style={s.ptsLabel}>pts</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.heroButton}
            onPress={() => router.push('/rewards/catalog')}
            activeOpacity={0.9}
          >
            <Text style={s.heroButtonText}>MY REWARDS</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* SECTION 2 — NEXT REWARD PROGRESS CARD */}
        {nextReward && (
          <View style={s.rewardsProgressCard}>
            <View style={s.progressRingContainer}>
              <Svg viewBox="0 0 36 36" width={64} height={64}>
                <Path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e9edff"
                  strokeWidth="3.5"
                />
                <Path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#6346cd"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(Math.max(progress * 100, 0), 100)}, 100`}
                  transform="rotate(-90 18 18)"
                />
              </Svg>
              <View style={s.progressTextContainer}>
                <Text style={s.progressPercentText}>
                  {Math.round(Math.min(Math.max(progress * 100, 0), 100))}%
                </Text>
              </View>
            </View>

            <View style={s.rewardsInfo}>
              <Text style={s.rewardsProgressLabel}>Your Progress</Text>
              <Text style={s.rewardsPointsText}>
                <Text style={s.rewardsPointsHighlight}>{userPoints}/{nextReward.points_required}</Text>
                <Text style={s.rewardsPointsTextNormal}> PTS to next reward</Text>
              </Text>
            </View>
          </View>
        )}

        {/* SECTION 3 — HOT REWARDS */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>HOT REWARDS</Text>
          <TouchableOpacity onPress={() => router.push('/rewards/catalog')} activeOpacity={0.7}>
            <Text style={s.seeAllText}>SEE ALL</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.horizontalScroll}
          contentContainerStyle={s.horizontalScrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {hotRewards.map((reward) => {
            const isLocked = userPoints < reward.points_required;
            const pointsNeeded = reward.points_required - userPoints;

            return (
              <TouchableOpacity
                key={reward.id}
                style={s.rewardCard}
                onPress={() => {
                  setSelectedReward(reward);
                  setShowRedemptionModal(true);
                }}
                activeOpacity={0.9}
              >
                {/* Image Section */}
                <View style={s.rewardImageWrap}>
                  {reward.image_url ? (
                    <Image source={{ uri: reward.image_url }} style={s.rewardCardImage} />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.secondary]}
                      style={s.rewardGradientPlaceholder}
                    >
                      <Tag size={32} color="white" />
                    </LinearGradient>
                  )}

                  {reward.reward_value && reward.reward_value.includes('%') && (
                    <View style={s.discountBadge}>
                      <Text style={s.discountBadgeText}>{reward.reward_value}</Text>
                    </View>
                  )}
                </View>

                {/* Content Section */}
                <View style={s.rewardCardContent}>
                  <Text style={s.rewardCardName} numberOfLines={1}>{reward.name}</Text>
                  
                  <View style={s.rewardPointsRow}>
                    <Star size={14} color={COLORS.primary} fill={COLORS.primary} />
                    <Text style={s.rewardPointsText}>{reward.points_required} pts</Text>
                  </View>

                  <Text style={s.rewardVendor} numberOfLines={1}>
                    {reward.vendor || reward.description}
                  </Text>
                </View>

                {/* Locked Overlay */}
                {isLocked && (
                  <View style={s.lockedOverlay}>
                    <Lock size={20} color={COLORS.onSurfaceVariant} style={s.lockIcon} />
                    <Text style={s.lockedText}>Need {pointsNeeded} pts</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={s.dotsContainer}>
          {hotRewards.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === activeDotIndex && s.dotActive,
              ]}
            />
          ))}
        </View>

        {/* SECTION 4 — POINT HISTORY */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>POINT HISTORY</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
            <Text style={s.seeAllText}>SEE ALL</Text>
          </TouchableOpacity>
        </View>

        <View style={s.historyContainer}>
          {pointHistory.length > 0 ? (
            pointHistory.map((entry, idx) => {
              const iconInfo = getHistoryIconInfo(entry.event_type);
              const IconComponent = iconInfo.icon;
              const isNegative = entry.points < 0;

              return (
                <View
                  key={entry.id || idx}
                  style={[
                    s.historyRow,
                    idx === pointHistory.length - 1 && s.lastHistoryRow,
                  ]}
                >
                  <View style={[s.historyIconCircle, { backgroundColor: iconInfo.bg }]}>
                    <IconComponent size={20} color={iconInfo.color} />
                  </View>

                  <View style={s.historyMiddle}>
                    <Text style={s.historyEventName} numberOfLines={1}>
                      {getHistoryEventName(entry)}
                    </Text>
                    <Text style={s.historyTime}>{formatTime(entry.created_at)}</Text>
                  </View>

                  <Text
                    style={[
                      s.historyPointsText,
                      isNegative ? s.negativePoints : s.positivePoints,
                    ]}
                  >
                    {isNegative ? '' : '+'}{entry.points}pts
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={s.emptyHistory}>
              <Text style={s.emptyHistoryText}>
                No points earned yet. Start splitting!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Redemption Sheet Modal */}
      {selectedReward && (
        <RedemptionModal
          visible={showRedemptionModal}
          reward={selectedReward}
          userPoints={userPoints}
          onClose={() => setShowRedemptionModal(false)}
          onRedeemed={async () => {
            await reloadAll();
            setShowRedemptionModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: COLORS.surface,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  headerAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 100,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  pointsText: {
    color: 'white',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 52,
  },
  ptsLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
  },
  heroButton: {
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rewardsProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(202,196,214,0.2)',
    shadowColor: '#141b2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  progressRingContainer: {
    width: 64,
    height: 64,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6346cd',
  },
  rewardsInfo: {
    flex: 1,
  },
  rewardsProgressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
  },
  rewardsPointsText: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: 'Outfit',
  },
  rewardsPointsHighlight: {
    color: '#6346cd',
    fontWeight: '700',
  },
  rewardsPointsTextNormal: {
    color: '#484554',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.onSurface,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  horizontalScroll: {
    marginHorizontal: -24,
  },
  horizontalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  rewardCard: {
    width: 200,
    marginRight: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  rewardImageWrap: {
    height: 130,
    position: 'relative',
    overflow: 'hidden',
  },
  rewardCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rewardGradientPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  rewardCardContent: {
    padding: 14,
  },
  rewardCardName: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.onSurface,
  },
  rewardPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  rewardPointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rewardVendor: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lockIcon: {
    marginBottom: 6,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.outlineVariant,
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.primary,
  },
  historyContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 165, 211, 0.2)',
  },
  lastHistoryRow: {
    borderBottomWidth: 0,
  },
  historyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMiddle: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  historyEventName: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.onSurface,
  },
  historyTime: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },
  historyPointsText: {
    fontWeight: '800',
    fontSize: 15,
  },
  positivePoints: {
    color: COLORS.success,
  },
  negativePoints: {
    color: COLORS.error,
  },
  emptyHistory: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
    textAlign: 'center',
  },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  Lock,
  Wallet,
  Tag,
  Star,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardsContext';
import type { CatalogItem } from '../../utils/rewardsMath';
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

export default function RewardsCatalogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rewards = useRewards();

  const userPoints = rewards.points ?? 0;
  const rewardsCatalog = rewards.catalog;
  const isLoading = rewards.points === null && rewards.isLoading;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(true); // Toggleable or always visible
  const [selectedTierFilter, setSelectedTierFilter] = useState<number | null>(null);

  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      rewards.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await rewards.refresh();
    setRefreshing(false);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) setSearchQuery(''); // Clear query when closing
  };

  // Determine display catalog (fallback to mock if empty)
  const displayCatalog = rewardsCatalog.length > 0 ? rewardsCatalog : MOCK_CATALOG;

  // Filter display catalog by search query
  const filteredCatalog = displayCatalog.filter((reward) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = reward.name?.toLowerCase().includes(query);
    const descMatch = reward.description?.toLowerCase().includes(query);
    const vendorMatch = reward.vendor?.toLowerCase().includes(query);
    return nameMatch || descMatch || vendorMatch;
  });

  // Extract tiers dynamically from the (potentially filtered) catalog
  const allTiers = Array.from(
    new Set(displayCatalog.map((r) => r.points_required))
  ).sort((a, b) => a - b);

  // Determine which tiers to display based on tier filter
  const activeTiers = selectedTierFilter !== null ? [selectedTierFilter] : allTiers;

  if (isLoading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading rewards catalog...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={s.headerTitle}>Divvit</Text>
        
        <TouchableOpacity style={s.searchBtn} onPress={toggleSearch} activeOpacity={0.7}>
          <Search size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* SEARCH BAR */}
        {showSearch && (
          <View style={s.searchBarContainer}>
            <Search size={20} color={COLORS.outline} />
            <TextInput
              style={s.searchInput}
              placeholder="Search rewards"
              placeholderTextColor={COLORS.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <X size={18} color={COLORS.outline} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* BALANCE BANNER */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDim]}
          style={s.balanceBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={s.balanceIconWrap}>
            <Wallet size={28} color="white" />
          </View>
          <View style={s.balanceTextWrap}>
            <Text style={s.balanceLabel}>CURRENT BALANCE</Text>
            <Text style={s.balancePoints}>{userPoints} PTS</Text>
          </View>
        </LinearGradient>

        {/* ACTIVE FILTER HEADER */}
        {selectedTierFilter !== null && (
          <View style={s.filterHeader}>
            <Text style={s.filterHeaderText}>Showing only {selectedTierFilter} PTS TIER</Text>
            <TouchableOpacity
              style={s.clearFilterBtn}
              onPress={() => setSelectedTierFilter(null)}
              activeOpacity={0.7}
            >
              <Text style={s.clearFilterText}>Show All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* POINT TIERS SECTIONS */}
        {activeTiers.map((tier) => {
          // Get rewards for this tier matching the search filter
          const tierRewards = filteredCatalog.filter((r) => r.points_required === tier);
          if (tierRewards.length === 0) return null;

          const isTierUnlocked = userPoints >= tier;

          return (
            <View key={tier} style={s.tierSection}>
              {/* Section Header Row */}
              <View style={s.tierHeaderRow}>
                <View style={s.tierHeaderLeft}>
                  {isTierUnlocked ? (
                    <View style={s.unlockedBadge}>
                      <Text style={s.unlockedBadgeText}>AVAILABLE</Text>
                    </View>
                  ) : (
                    <Lock size={18} color={COLORS.onSurface} style={s.lockIcon} />
                  )}
                  <Text style={s.tierTitle}>{tier} PTS TIER</Text>
                </View>

                {selectedTierFilter === null ? (
                  <TouchableOpacity onPress={() => setSelectedTierFilter(tier)} activeOpacity={0.7}>
                    <Text style={s.viewAllText}>View All</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setSelectedTierFilter(null)} activeOpacity={0.7}>
                    <Text style={s.viewAllText}>Show All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Horizontal Scroll of rewards in this tier */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.horizontalScroll}
                contentContainerStyle={s.horizontalScrollContent}
              >
                {tierRewards.map((reward) => {
                  const isAvailable = userPoints >= reward.points_required;
                  const isFeatured = reward.display_order <= 3; // Mocking featured state

                  return (
                    <View key={reward.id} style={s.rewardCard}>
                      {/* Reward Image */}
                      <View style={s.rewardImageWrap}>
                        {reward.image_url ? (
                          <Image source={{ uri: reward.image_url }} style={s.rewardImage} />
                        ) : (
                          <LinearGradient
                            colors={[COLORS.primary, COLORS.secondary]}
                            style={s.rewardGradientPlaceholder}
                          >
                            <Tag size={28} color="white" />
                          </LinearGradient>
                        )}

                        {isFeatured && (
                          <View style={s.hotDealBadge}>
                            <Text style={s.hotDealText}>HOT DEAL</Text>
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View style={s.rewardContent}>
                        <Text style={s.rewardName} numberOfLines={1}>{reward.name}</Text>
                        <Text style={s.rewardVendor} numberOfLines={1}>
                          {reward.vendor || 'Partner Store'}
                        </Text>

                        {/* Action Pill Button */}
                        <TouchableOpacity
                          style={[
                            s.actionButton,
                            isAvailable ? s.redeemBtn : s.lockedBtn,
                          ]}
                          onPress={() => {
                            if (isAvailable) {
                              setSelectedReward(reward);
                              setShowRedemptionModal(true);
                            }
                          }}
                          disabled={!isAvailable}
                          activeOpacity={0.85}
                        >
                          {!isAvailable && <Lock size={12} color={COLORS.outline} style={s.btnLockIcon} />}
                          <Text
                            style={[
                              s.actionButtonText,
                              isAvailable ? s.redeemBtnText : s.lockedBtnText,
                            ]}
                          >
                            {isAvailable ? 'REDEEM' : 'LOCKED'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        {filteredCatalog.length === 0 && (
          <View style={s.noResults}>
            <Text style={s.noResultsText}>No rewards matching your search query.</Text>
          </View>
        )}

        <View style={s.sqlReminder}>
          <Text style={s.sqlReminderText}>
            {/* TODO: Seed rewards_catalog table in Supabase */}
            {/* Run: INSERT INTO rewards_catalog ... (see 004_rewards.sql) */}
          </Text>
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
            await rewards.refresh();
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
  backBtn: {
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
    letterSpacing: 1,
    textAlign: 'center',
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 80,
  },
  searchBarContainer: {
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  balanceBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTextWrap: {
    justifyContent: 'center',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  balancePoints: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  filterHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tierSection: {
    marginBottom: 28,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlockedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  unlockedBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  lockIcon: {
    marginRight: 4,
  },
  tierTitle: {
    color: COLORS.onSurface,
    fontWeight: '800',
    fontSize: 18,
  },
  viewAllText: {
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
    width: 180,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardImageWrap: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  rewardImage: {
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
  hotDealBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hotDealText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rewardContent: {
    padding: 14,
  },
  rewardName: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.onSurface,
  },
  rewardVendor: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
    marginBottom: 12,
  },
  actionButton: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  redeemBtn: {
    backgroundColor: COLORS.primary,
  },
  lockedBtn: {
    backgroundColor: COLORS.surfaceContainer,
  },
  btnLockIcon: {
    marginRight: 2,
  },
  actionButtonText: {
    fontSize: 12,
    textAlign: 'center',
  },
  redeemBtnText: {
    color: 'white',
    fontWeight: '800',
  },
  lockedBtnText: {
    color: COLORS.outline,
    fontWeight: '700',
  },
  noResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
  },
  sqlReminder: {
    marginTop: 24,
    alignItems: 'center',
  },
  sqlReminderText: {
    fontSize: 10,
    color: COLORS.outline,
    textAlign: 'center',
  },
});

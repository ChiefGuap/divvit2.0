import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Pencil, Trash2, FileText, Utensils, Award, Receipt, Coffee } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import TabHeader from '@/components/TabHeader';
import { getInitials, getNextColor } from '../../types';
import { useHomeStats } from '@/hooks/useHomeStats';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getUserPoints } from '@/services/rewardsService';

// Format currency helper with commas for thousands
const formatCurrency = (amount: number): string => {
  const rounded = Math.round(amount);
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Draft Card Component (Retained from original)
const DraftCard = ({
  id,
  formattedDate,
  itemCount,
  onEdit,
  onDelete
}: {
  id: string;
  formattedDate: string;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View
    style={styles.draftCard}
  >
    {/* Tappable main area */}
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.7}
      style={styles.draftMainArea}
    >
      {/* Icon */}
      <View style={styles.draftIconContainer}>
        <FileText size={20} color="#D97706" />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.draftTitle}>{formattedDate}</Text>
        <Text style={styles.draftSubtitle}>{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</Text>
      </View>
    </TouchableOpacity>

    {/* Actions - separate from main tap area */}
    <View style={styles.draftActions}>
      <TouchableOpacity
        onPress={onEdit}
        style={styles.draftActionBtn}
        activeOpacity={0.7}
      >
        <Pencil size={16} color="#D97706" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.draftDeleteBtn}
        activeOpacity={0.7}
      >
        <Trash2 size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const { isLoading: isAuthLoading, session, user, profile } = useAuth();
  const { totalSplit, minutesSaved, recentActivity, drafts, isLoading, deleteDraft, refetch } = useHomeStats();

  const [userPoints, setUserPoints] = useState(0);
  const [nextRewardPoints] = useState(500); // TODO: fetch from catalog if needed

  useEffect(() => {
    const fetchPoints = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const pts = await getUserPoints(user.id);
        setUserPoints(pts || 0);
      }
    };
    fetchPoints();
  }, []);

  // Refetch drafts when screen is focused (e.g., returning from draft save)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // CRITICAL: If auth is still loading, show a full loading screen
  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#6346cd" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // If auth finished but no session, show nothing (NavigationController will redirect)
  if (!session) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#6346cd" />
      </SafeAreaView>
    );
  }

  const handleScanPress = () => {
    router.push('/camera/capture');
  };

  const handleManualScan = async () => {
    if (!user || !session) {
      Alert.alert('Error', 'Please log in to create a bill.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      // Create a new draft bill in Supabase
      const billResponse = await fetch(
        `${supabaseUrl}/rest/v1/bills`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            host_id: user.id,
            total_amount: 0,
            status: 'draft',
            details: {
              items: [],
              scannedTip: 0,
              is_manual: true,
            }
          }),
        }
      );

      if (!billResponse.ok) {
        throw new Error('Failed to create bill');
      }

      const billData = await billResponse.json();
      const billId = billData[0].id;

      // Add host as first participant
      const displayName = profile?.username || user.email?.split('@')[0] || 'You';

      await fetch(
        `${supabaseUrl}/rest/v1/bill_participants`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            bill_id: billId,
            user_id: user.id,
            name: displayName,
            is_guest: false,
            color: getNextColor(0),
            initials: getInitials(displayName),
          }),
        }
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to Party Size Screen
      router.push({
        pathname: '/bill/party-size',
        params: {
          billId: billId,
          isManualEntry: 'true',
        }
      });
    } catch (error: any) {
      console.error('HomeScreen: Error creating manual bill:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create bill. Please try again.');
    }
  };

  const handleRecentLogs = () => {
    router.push('/(tabs)/history');
  };

  const handleEditDraft = (draftId: string) => {
    Haptics.selectionAsync();
    router.push({
      pathname: `/bill/${draftId}` as any,
    });
  };

  const handleDeleteDraft = (draftId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Draft?',
      'This draft will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteDraft(draftId);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', 'Failed to delete draft. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleViewHistory = async (billId: string) => {
    Haptics.selectionAsync();

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/bills?id=eq.${billId}&select=*`,
        {
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch bill');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const bill = data[0];
        router.push({
          pathname: `/bill/history/${billId}` as any,
          params: {
            billData: JSON.stringify(bill),
          }
        });
      } else {
        Alert.alert('Error', 'Bill not found.');
      }
    } catch (error) {
      console.error('Error fetching bill for history:', error);
      Alert.alert('Error', 'Failed to load bill details.');
    }
  };

  const progressClamped = Math.min(Math.max((userPoints / nextRewardPoints) * 100, 0), 100);

  return (
    <LinearGradient
      colors={['#f0ebff', '#f9f9ff']}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <TabHeader points={userPoints} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SECTION 1 — TOTAL SPLIT CARD */}
          <View style={styles.totalSplitCard}>
            <View style={styles.totalSplitTopRow}>
              <Text style={styles.totalSplitLabel}>TOTAL SPLIT</Text>
              <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(99, 70, 205, 0.3)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="m22 7-8.5 8.5-5-5L2 17" />
                <Path d="M16 7h6v6" />
              </Svg>
            </View>
            <Text style={styles.totalSplitAmount}>
              {isLoading ? '$0' : formatCurrency(totalSplit)}
            </Text>
            
            <Svg
              viewBox="0 0 100 20"
              style={styles.sparkline}
              preserveAspectRatio="none"
            >
              <Path
                d="M0 20 Q 20 15 40 18 T 80 5 T 100 0 V 20 H 0 Z"
                fill="rgba(99,70,205,0.08)"
              />
            </Svg>
          </View>

          {/* SECTION 2 — NEW SPLIT BUTTON */}
          <TouchableOpacity
            style={styles.newSplitButton}
            onPress={handleScanPress}
            activeOpacity={0.92}
          >
            <View style={styles.plusCircle}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12h14" />
                <Path d="M12 5v14" />
              </Svg>
            </View>
            <Text style={styles.newSplitText}>New Split</Text>
          </TouchableOpacity>

          {/* SECTION 3 — MANUAL SCAN BUTTON */}
          <TouchableOpacity
            style={styles.manualScanButton}
            onPress={handleManualScan}
            activeOpacity={0.85}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#6346cd" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 6V4h2" />
              <Path d="M18 4h2v2" />
              <Path d="M20 18v2h-2" />
              <Path d="M6 20H4v-2" />
              <Path d="M7 8h10" />
              <Path d="M7 12h10" />
              <Path d="M7 16h6" />
            </Svg>
            <Text style={styles.manualScanText}>Manual Scan</Text>
          </TouchableOpacity>

          {/* Pending Drafts */}
          {!isLoading && drafts.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.draftsHeader}>
                <Text style={styles.draftsTitle}>Pending Drafts</Text>
                <View style={styles.draftsBadge}>
                  <Text style={styles.draftsBadgeText}>{drafts.length}</Text>
                </View>
              </View>

              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  id={draft.id}
                  formattedDate={draft.formattedDate}
                  itemCount={draft.itemCount}
                  onEdit={() => handleEditDraft(draft.id)}
                  onDelete={() => handleDeleteDraft(draft.id)}
                />
              ))}
            </View>
          )}

          {/* SECTION 4 — REWARDS PROGRESS CARD */}
          <View style={styles.rewardsCard}>
            <View style={styles.progressRingContainer}>
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
                  strokeDasharray={`${progressClamped}, 100`}
                  transform="rotate(-90 18 18)"
                />
              </Svg>
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressPercentText}>
                  {Math.round(progressClamped)}%
                </Text>
              </View>
            </View>

            <View style={styles.rewardsInfo}>
              <Text style={styles.rewardsProgressLabel}>Your Progress</Text>
              <Text style={styles.rewardsPointsText}>
                <Text style={styles.rewardsPointsHighlight}>{userPoints}/{nextRewardPoints}</Text>
                <Text style={styles.rewardsPointsTextNormal}> PTS to next reward</Text>
              </Text>
            </View>
          </View>

          {/* SECTION 5 — RECENT ACTIVITY */}
          <View style={styles.activityHeaderRow}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={handleRecentLogs} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color="#6346cd" style={{ marginTop: 12 }} />
          ) : recentActivity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Receipt size={32} color="#9CA3AF" />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
              <Text style={styles.emptyActivitySub}>Split a bill to see it here</Text>
            </View>
          ) : (
            recentActivity.map((item) => {
              const isFood = item.title.toLowerCase().includes('dinner') || item.title.toLowerCase().includes('lunch') || item.title.toLowerCase().includes('restaurant') || item.title.toLowerCase().includes('split');
              const isPromo = item.title.toLowerCase().includes('promo') || item.title.toLowerCase().includes('promotion') || item.title.toLowerCase().includes('used');
              
              let iconBg = '#f5f5f5';
              let iconColor = '#484554';
              let IconComponent = Receipt;
              let statusText = 'PAID';
              let statusColor = '#16a34a';
              let statusBg = '#dcfce7';
              let priceText = '';

              const hashAmount = item.id.charCodeAt(0) * 1.5 || 45.20;

              if (isFood) {
                iconBg = '#fff3e0';
                iconColor = '#e65100';
                IconComponent = Utensils;
                statusText = 'PAID';
                statusColor = '#16a34a';
                statusBg = '#dcfce7';
                priceText = `$${hashAmount.toFixed(2)}`;
              } else if (isPromo) {
                iconBg = '#fff8e1';
                iconColor = '#f57f17';
                IconComponent = Coffee;
                statusText = 'PENDING';
                statusColor = '#6346cd';
                statusBg = '#f3e5f5';
                priceText = '+2 pts';
              } else {
                iconBg = '#f3e5f5';
                iconColor = '#6346cd';
                IconComponent = Award;
                statusText = 'PAID';
                statusColor = '#16a34a';
                statusBg = '#dcfce7';
                priceText = `$${hashAmount.toFixed(2)}`;
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleViewHistory(item.id)}
                  activeOpacity={0.7}
                  style={styles.activityCard}
                >
                  <View style={styles.activityLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                      <IconComponent size={24} color={iconColor} />
                    </View>
                    <View style={styles.activityMiddle}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.activityTimestamp}>{item.subtitle}</Text>
                    </View>
                  </View>

                  <View style={styles.activityRight}>
                    <Text style={styles.activityAmount}>{priceText}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#484554',
    fontFamily: 'Outfit',
    fontSize: 14,
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  totalSplitCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(99,70,205,0.05)',
    overflow: 'hidden',
    shadowColor: '#6346cd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    position: 'relative',
    minHeight: 120,
  },
  totalSplitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSplitLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(72,69,84,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Outfit',
  },
  totalSplitAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#6346cd',
    fontFamily: 'Outfit',
    letterSpacing: -1,
    marginTop: 4,
    zIndex: 1,
  },
  sparkline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  newSplitButton: {
    marginTop: 16,
    height: 120,
    backgroundColor: '#6346cd',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#6346cd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  plusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSplitText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Outfit',
    letterSpacing: -0.3,
  },
  manualScanButton: {
    marginTop: 12,
    height: 64,
    backgroundColor: '#f0ebff',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 70, 205, 0.15)',
  },
  manualScanText: {
    color: '#141b2b',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit',
  },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FCD34D',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  draftMainArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  draftIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  draftTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
  },
  draftSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D97706',
    fontFamily: 'Outfit',
    marginTop: 2,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftActionBtn: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
  },
  draftDeleteBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
  },
  draftsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  draftsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
  },
  draftsBadge: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  draftsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  rewardsCard: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
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
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6346cd',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(202,196,214,0.1)',
    shadowColor: '#141b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMiddle: {
    flex: 1,
    marginLeft: 14,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
  },
  activityTimestamp: {
    fontSize: 12,
    color: '#484554',
    marginTop: 2,
    fontFamily: 'Outfit',
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(202,196,214,0.1)',
  },
  emptyActivityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#141b2b',
    fontFamily: 'Outfit',
    marginTop: 8,
  },
  emptyActivitySub: {
    fontSize: 12,
    color: '#484554',
    fontFamily: 'Outfit',
    marginTop: 2,
  },
});

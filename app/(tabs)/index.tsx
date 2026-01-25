import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowRight, Clock, DollarSign, Receipt, Pencil, Trash2, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScanButton } from '@/components/home/ScanButton';
import { getInitials, getNextColor } from '../../types';
import { ManualScanButton } from '@/components/home/ManualScanButton';
import { MetricCard } from '@/components/home/MetricCard';
import { BillListItem } from '@/components/home/BillListItem';
import { useHomeStats } from '@/hooks/useHomeStats';
import { useAuth } from '@/context/AuthContext';

// Format currency helper
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(0)}`;
};

// Skeleton loader component for metric cards
const SkeletonMetricCard = () => (
  <View className="flex-1 bg-divvit-card rounded-3xl p-5 min-h-[120px] items-center justify-center">
    <View className="w-8 h-8 bg-gray-200 rounded-full mb-2" />
    <View className="w-16 h-8 bg-gray-200 rounded-lg mb-1" />
    <View className="w-20 h-4 bg-gray-200 rounded" />
  </View>
);

// Skeleton loader for bill list items
const SkeletonBillItem = () => (
  <View className="flex-row items-center py-3 border-b border-gray-100">
    <View className="w-10 h-10 bg-gray-200 rounded-xl mr-4" />
    <View className="flex-1">
      <View className="w-40 h-4 bg-gray-200 rounded mb-2" />
      <View className="w-20 h-3 bg-gray-200 rounded" />
    </View>
  </View>
);

// Empty state component for recent activity
const EmptyRecentActivity = () => (
  <View className="items-center py-8">
    <Receipt size={32} color="#9CA3AF" />
    <Text className="text-divvit-muted text-sm mt-2">No recent activity</Text>
    <Text className="text-divvit-muted text-xs">Split a bill to see it here</Text>
  </View>
);

// Draft Card Component
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
    className="flex-row items-center p-4 mb-3 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300"
    style={{
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}
  >
    {/* Tappable main area */}
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.7}
      className="flex-row items-center flex-1"
    >
      {/* Icon */}
      <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center mr-3">
        <FileText size={20} color="#D97706" />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className="text-divvit-text font-medium text-sm">{formattedDate}</Text>
        <Text className="text-amber-600 text-xs">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</Text>
      </View>
    </TouchableOpacity>

    {/* Actions - separate from main tap area */}
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={onEdit}
        className="p-2 mr-2 bg-amber-100 rounded-full"
        activeOpacity={0.7}
      >
        <Pencil size={16} color="#D97706" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        className="p-2 bg-red-100 rounded-full"
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
  const { points, totalSplit, minutesSaved, recentActivity, drafts, isLoading, deleteDraft, refetch } = useHomeStats();

  // Refetch drafts when screen is focused (e.g., returning from draft save)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // CRITICAL: If auth is still loading, show a full loading screen
  // This prevents flash of empty/mock data on web reload
  if (isAuthLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#B54CFF" />
        <Text className="text-divvit-muted text-sm mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  // If auth finished but no session, show nothing (NavigationController will redirect)
  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#B54CFF" />
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

      // Navigate to Party Screen (not setup)
      router.push({
        pathname: '/bill/party',
        params: {
          id: billId,
          isManualEntry: 'true',
        }
      });
    } catch (error: any) {
      console.error('HomeScreen: Error creating manual bill:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create bill. Please try again.');
    }
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

    // Fetch complete bill data from Supabase before navigating
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center py-4 mb-2">
          <Text className="text-3xl font-heading font-bold text-divvit-text">Divvit</Text>
          <View className="bg-divvit-card px-3 py-1.5 rounded-full border border-gray-200">
            {isLoading ? (
              <View className="w-16 h-4 bg-gray-200 rounded" />
            ) : (
              <Text className="text-divvit-text font-body font-semibold text-sm">{points} points</Text>
            )}
          </View>
        </View>

        {/* Scan Actions */}
        <ScanButton onPress={handleScanPress} />
        <ManualScanButton onPress={handleManualScan} />

        {/* Metrics */}
        <View className="flex-row gap-4 mb-8">
          {isLoading ? (
            <>
              <SkeletonMetricCard />
              <SkeletonMetricCard />
            </>
          ) : (
            <>
              <MetricCard
                value={formatCurrency(totalSplit)}
                label="split so far..."
                icon={DollarSign}
                iconColor="#22C55E" // Green
              />
              <MetricCard
                value={String(minutesSaved)}
                label="minutes saved"
                icon={Clock}
                iconColor="#B54CFF" // Purple
                info
              />
            </>
          )}
        </View>

        {/* Pending Drafts - Only show if there are drafts */}
        {!isLoading && drafts.length > 0 && (
          <View className="mb-8">
            <View className="flex-row justify-between items-end mb-3">
              <View className="flex-row items-center">
                <Text className="text-lg font-heading font-bold text-divvit-text">Pending Drafts</Text>
                <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full">
                  <Text className="text-amber-700 text-xs font-bold">{drafts.length}</Text>
                </View>
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

        {/* Promotions */}
        <View className="mb-8">
          <Text className="text-lg font-heading font-bold text-divvit-text mb-3">Promotions</Text>
          <View
            className="bg-white rounded-2xl overflow-hidden flex-row items-center h-24 pr-4 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Placeholder for Panda Express Logo */}
            <View className="h-full aspect-square bg-red-600 justify-center items-center mr-4">
              <Text className="text-white font-bold text-xs text-center px-1">PANDA EXPRESS</Text>
            </View>
            <View className="flex-1">
              <Text className="text-divvit-text font-bold text-base">BOGO 50% OFF</Text>
            </View>
            <View className="items-center justify-center">
              <ArrowRight color="#111827" size={24} />
              <Text className="text-xs font-bold mt-1 text-divvit-text">see more</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-20">
          <View className="flex-row justify-between items-end mb-3">
            <Text className="text-lg font-heading font-bold text-divvit-text">Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text className="text-sm font-body text-divvit-muted mb-1">see all</Text>
            </TouchableOpacity>
          </View>

          <View
            className="bg-white rounded-3xl p-4 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {isLoading ? (
              <>
                <SkeletonBillItem />
                <SkeletonBillItem />
              </>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((bill) => (
                <TouchableOpacity
                  key={bill.id}
                  onPress={() => handleViewHistory(bill.id)}
                  activeOpacity={0.7}
                >
                  <BillListItem title={bill.title} subtitle={bill.subtitle} />
                </TouchableOpacity>
              ))
            ) : (
              <EmptyRecentActivity />
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

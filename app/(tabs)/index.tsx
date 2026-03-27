import React, { useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Pencil, Trash2, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getInitials, getNextColor } from '../../types';
import { useHomeStats } from '@/hooks/useHomeStats';
import { useAuth } from '@/context/AuthContext';

import { DashboardHeader } from '@/components/home/DashboardHeader';
import { MetricStats } from '@/components/home/MetricStats';
import { DashboardActions } from '@/components/home/DashboardActions';
import { PromotionCard } from '@/components/home/PromotionCard';
import { RecentActivityList } from '@/components/home/RecentActivityList';

// Format currency helper
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(0)}`;
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
    className="flex-row items-center p-4 mb-3 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 shadow-sm"
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
        <Text className="text-on-surface font-heading font-bold text-sm">{formattedDate}</Text>
        <Text className="text-amber-600 font-body font-medium text-xs">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</Text>
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
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#4b29b4" />
        <Text className="text-on-surface-variant font-body text-sm mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  // If auth finished but no session, show nothing (NavigationController will redirect)
  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#4b29b4" />
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

      // Navigate to Party Screen
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

  const firstName = profile?.username?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <DashboardHeader />
      
      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* Welcome Text */}
        <View className="mb-6">
          <Text className="text-3xl font-heading font-extrabold tracking-tight text-on-surface mb-1">
            Hey, {firstName}
          </Text>
          <Text className="text-on-surface-variant font-body font-medium">Ready to settle up?</Text>
        </View>

        {/* Top Metrics */}
        {isLoading ? (
          <View className="flex-row gap-4 mb-8">
            <View className="flex-[0.58] bg-gray-200 rounded-[2rem] p-6 min-h-[180px]" />
            <View className="flex-[0.42] bg-gray-200 rounded-[2rem] p-6 min-h-[180px]" />
          </View>
        ) : (
          <MetricStats 
            totalSplit={formatCurrency(totalSplit)} 
            minutesSaved={String(minutesSaved)} 
          />
        )}

        {/* Dashboard Actions */}
        <DashboardActions 
          onNewSplit={handleScanPress}
          onManualScan={handleManualScan}
          onRecentLogs={handleRecentLogs}
        />

        {/* Pending Drafts */}
        {!isLoading && drafts.length > 0 && (
          <View className="mb-8">
            <View className="flex-row justify-between items-end mb-3 px-2">
              <View className="flex-row items-center">
                <Text className="text-xl font-heading font-extrabold tracking-tight text-on-surface">Pending Drafts</Text>
                <View className="ml-3 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <Text className="text-amber-700 font-heading text-xs font-bold">{drafts.length}</Text>
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

        {/* Promotion */}
        <PromotionCard />

        {/* Recent Activity */}
        <RecentActivityList 
          items={recentActivity} 
          onItemPress={handleViewHistory} 
          isLoading={isLoading} 
        />
        
      </ScrollView>
    </SafeAreaView>
  );
}

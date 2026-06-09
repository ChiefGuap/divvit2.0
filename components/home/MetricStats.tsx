import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useRewards } from '../../context/RewardsContext';
import { getNextReward } from '../../utils/rewardsMath';

interface MetricStatsProps {
  totalSplit: string; // pre-formatted currency string e.g., "$2,976"
  minutesSaved: string; // e.g., "45"
}

export function MetricStats({ totalSplit }: MetricStatsProps) {
  const { points, catalog } = useRewards();
  const currentPoints = points ?? 0;
  const { nextReward, pointsLeft, progressPercent, totalNeeded, isMaxed } =
    getNextReward(currentPoints, catalog);

  const rewardName = nextReward?.name ?? '—';

  return (
    <View className="flex-row gap-4 mb-8 items-stretch">
      {/* Total Split Card */}
      <View className="flex-1 bg-primary-container rounded-[2rem] p-6 shadow-md shadow-primary/20 min-h-[180px] justify-between">
        <View className="flex-row justify-between items-start">
          <Text className="text-sm font-heading font-bold text-white uppercase tracking-widest opacity-80">Total Split</Text>
          <TrendingUp size={24} color="#ffffff" />
        </View>
        <View>
          <Text className="text-4xl font-heading font-extrabold text-white tracking-tighter">{totalSplit}</Text>
          <Text className="text-xs font-body font-semibold text-white/70 mt-1 uppercase tracking-wider">split so far...</Text>
        </View>
      </View>

      {/* My Rewards Card */}
      <View
        className="flex-1 rounded-[2rem] min-h-[180px] justify-between"
        style={{
          backgroundColor: '#ffffff',
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <Text style={{
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: '#484554',
          marginBottom: 4,
        }}>
          My Rewards
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#111827',
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {rewardName}
        </Text>

        <Text style={{
          fontSize: 12,
          fontWeight: '600',
          color: '#4b29b4',
          marginBottom: 10,
        }}>
          {isMaxed
            ? 'Max tier reached!'
            : nextReward
              ? `${pointsLeft} pts until next reward`
              : 'Earn points by splitting bills'}
        </Text>

        <View style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: '#f1f3ff',
          marginBottom: 8,
          overflow: 'hidden',
        }}>
          <View style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: '#4b29b4',
            width: `${progressPercent * 100}%`,
          }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#484554' }}>0</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#111827' }}>{currentPoints}PTS</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#484554' }}>{totalNeeded || 0}PTS</Text>
        </View>
      </View>
    </View>
  );
}

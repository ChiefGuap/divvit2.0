import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp } from 'lucide-react-native';

// TODO: fetch from Supabase rewards points
const rewardName = "$10 Gift Card";
const currentPoints = 578;
const pointsToNextReward = 422;
const totalPointsNeeded = 1000;
const progressPercent = currentPoints / totalPointsNeeded;

interface MetricStatsProps {
  totalSplit: string; // pre-formatted currency string e.g., "$2,976"
  minutesSaved: string; // e.g., "45"
}

export function MetricStats({ totalSplit, minutesSaved }: MetricStatsProps) {
  return (
    <View className="flex-row gap-4 mb-8 items-stretch">
      {/* Total Split Card — amount bottom-aligned via justify-between */}
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
        {/* A) Header label */}
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

        {/* B) Current reward name */}
        <Text style={{
          fontSize: 18,
          fontWeight: '800',
          color: '#141b2b',
          marginBottom: 2,
        }}>
          {rewardName}
        </Text>

        {/* C) Points until next reward */}
        <Text style={{
          fontSize: 12,
          fontWeight: '600',
          color: '#4b29b4',
          marginBottom: 10,
        }}>
          {pointsToNextReward} pts until next reward
        </Text>

        {/* D) Progress bar */}
        <View style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: '#e1e8fd',
          marginBottom: 8,
          overflow: 'hidden',
        }}>
          <View style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: '#4b29b4',
            width: `${progressPercent * 100}%`, // TODO: wire to Supabase rewards points
          }} />
        </View>

        {/* E) Points scale row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#484554' }}>0</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#141b2b' }}>{currentPoints}PTS</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#484554' }}>{totalPointsNeeded}PTS</Text>
        </View>
      </View>
    </View>
  );
}

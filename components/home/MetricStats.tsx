import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, Clock } from 'lucide-react-native';

interface MetricStatsProps {
  totalSplit: string; // pre-formatted currency string e.g., "$2,976"
  minutesSaved: string; // e.g., "45"
}

export function MetricStats({ totalSplit, minutesSaved }: MetricStatsProps) {
  return (
    <View className="flex-row gap-4 mb-8 items-stretch">
      {/* Total Split Card — amount bottom-aligned via justify-between */}
      <View className="flex-[0.58] bg-primary-container rounded-[2rem] p-6 shadow-md shadow-primary/20 min-h-[180px] justify-between">
        <View className="flex-row justify-between items-start">
          <Text className="text-sm font-heading font-bold text-white uppercase tracking-widest opacity-80">Total Split</Text>
          <TrendingUp size={24} color="#ffffff" />
        </View>
        <View>
          <Text className="text-4xl font-heading font-extrabold text-white tracking-tighter">{totalSplit}</Text>
          <Text className="text-xs font-body font-semibold text-white/70 mt-1 uppercase tracking-wider">split so far...</Text>
        </View>
      </View>

      {/* Minutes Saved Card — icon + text vertically centered */}
      <View className="flex-[0.42] bg-surface-container-high rounded-[2rem] p-6 min-h-[180px] items-center justify-center gap-4">
        <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }}>
          <Clock size={24} color="#4b29b4" />
        </View>
        <View className="items-center">
          <Text className="text-2xl font-heading font-extrabold text-on-surface tracking-tight">{minutesSaved}m</Text>
          <Text className="text-[10px] font-heading font-bold text-on-surface-variant uppercase tracking-wider">saved</Text>
        </View>
      </View>
    </View>
  );
}

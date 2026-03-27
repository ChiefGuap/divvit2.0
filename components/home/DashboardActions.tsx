import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus, ScanText, History } from 'lucide-react-native';

interface DashboardActionsProps {
  onNewSplit: () => void;
  onManualScan: () => void;
  onRecentLogs: () => void;
}

export function DashboardActions({ onNewSplit, onManualScan, onRecentLogs }: DashboardActionsProps) {
  return (
    <View className="mb-8">
      <View className="flex-col gap-4">
        {/* New Split Button — reduced vertical padding so height ~110px */}
        <TouchableOpacity
          onPress={onNewSplit}
          activeOpacity={0.9}
          className="w-full bg-primary py-4 px-6 rounded-[2.5rem] flex-col items-center justify-center gap-3 shadow-md shadow-primary/25"
        >
          <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center border border-white/30">
            <Plus size={28} color="#ffffff" />
          </View>
          <Text className="text-white font-heading font-bold text-xl tracking-tight">New Split</Text>
        </TouchableOpacity>

        <View className="w-full flex-row gap-4">
          <TouchableOpacity
            onPress={onManualScan}
            activeOpacity={0.8}
            className="flex-1 bg-surface-container-low p-6 rounded-[2rem] flex-col items-center justify-center gap-3"
            style={{ minHeight: 100 }}
          >
            <ScanText size={32} color="#4a28b3" />
            <Text className="text-on-surface font-heading font-bold text-sm">Manual Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRecentLogs}
            activeOpacity={0.8}
            className="flex-1 bg-surface-container-low p-6 rounded-[2rem] flex-col items-center justify-center gap-3"
            style={{ minHeight: 100 }}
          >
            <History size={32} color="#4a28b3" />
            <Text className="text-on-surface font-heading font-bold text-sm">Recent Logs</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

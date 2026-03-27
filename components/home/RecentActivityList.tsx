import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Utensils, Fuel, Receipt } from 'lucide-react-native';

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
}

interface RecentActivityListProps {
  items: ActivityItem[];
  onItemPress: (id: string) => void;
  isLoading?: boolean;
}

export function RecentActivityList({ items, onItemPress, isLoading }: RecentActivityListProps) {
  if (isLoading) {
    return (
      <View className="flex-col gap-4 mb-20">
        <Text className="text-xl font-heading font-extrabold tracking-tight px-2 text-on-surface">Recent Activity</Text>
        {[1, 2].map((i) => (
          <View key={i} className="bg-white rounded-[1.5rem] p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4 flex-1">
              <View className="w-12 h-12 bg-gray-200 rounded-2xl" />
              <View className="flex-1">
                <View className="w-32 h-5 bg-gray-200 rounded mb-1" />
                <View className="w-20 h-3 bg-gray-200 rounded" />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-col gap-4 mb-20">
      <Text className="text-xl font-heading font-extrabold tracking-tight px-2 text-on-surface mb-2">Recent Activity</Text>

      {items.length === 0 ? (
        <View className="items-center py-8 bg-white rounded-[1.5rem]">
          <Receipt size={32} color="#9CA3AF" />
          <Text className="text-on-surface-variant font-body font-medium text-sm mt-2">No recent activity</Text>
          <Text className="text-on-surface-variant font-body text-xs">Split a bill to see it here</Text>
        </View>
      ) : (
        items.map((item) => {
          const isGas = item.title.toLowerCase().indexOf('gas') !== -1;
          const isFood = item.title.toLowerCase().indexOf('restaurant') !== -1 || item.title.toLowerCase().indexOf('dinner') !== -1 || item.title.toLowerCase().indexOf('lunch') !== -1;

          let Icon = Receipt;
          let iconColor = "#4b29b4";
          let statusText = "Settled";
          let statusColor = "#166534";       // green-800
          let statusBgColor = "#dcfce7";     // green-100

          if (isFood) {
            Icon = Utensils;
          } else if (isGas) {
            Icon = Fuel;
            iconColor = "#61578d";
            statusText = "Pending";
            statusColor = "#92400e";         // amber-800
            statusBgColor = "#fef3c7";       // amber-100
          }

          const hashAmount = item.id.charCodeAt(0) * 1.5 || 45.20;

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onItemPress(item.id)}
              activeOpacity={0.7}
              className="bg-white rounded-[1.5rem] p-4 flex-row items-center justify-between"
            >
              {/* Left: icon + title + date — flex-1 so it shrinks before pushing the price off */}
              <View className="flex-row items-center gap-4 flex-1 mr-3">
                <View className="w-12 h-12 bg-surface-container-low rounded-2xl items-center justify-center shrink-0">
                  <Icon size={24} color={iconColor} />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-heading font-bold text-on-surface"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  <Text className="text-xs font-body font-medium text-on-surface-variant">{item.subtitle}</Text>
                </View>
              </View>

              {/* Right: amount + status pill — shrink-0 so it never gets compressed */}
              <View className="items-end shrink-0">
                <Text className="font-heading font-extrabold text-on-surface">${hashAmount.toFixed(2)}</Text>
                <View
                  className="px-2 py-0.5 rounded-full mt-0.5"
                  style={{ backgroundColor: statusBgColor }}
                >
                  <Text
                    className="text-[10px] font-heading font-bold uppercase tracking-tighter"
                    style={{ color: statusColor }}
                  >
                    {statusText}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

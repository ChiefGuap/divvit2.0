import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

type PromotionCardProps = {
  restaurant?: string;
  title?: string;
  badge?: string;
  imageUrl?: string | null;
  onPress?: () => void;
};

export function PromotionCard({
  restaurant = 'Restaurant',
  title = 'Check out this deal',
  badge = 'Limited Offer',
  imageUrl = null,
  onPress,
}: PromotionCardProps) {
  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-end px-2 mb-4">
        <Text className="text-xl font-heading font-extrabold tracking-tight text-on-surface">Promotions</Text>
        <TouchableOpacity className="px-2" onPress={onPress}>
          <Text className="text-primary font-heading font-bold text-sm">See all</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity activeOpacity={0.9} className="relative overflow-hidden rounded-[2.5rem] h-48 bg-surface-container-highest" onPress={onPress}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#4b29b4' }} />
        )}
        <View className="absolute inset-0 bg-black/40 p-6 flex-col justify-end">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white/80 font-heading text-xs font-bold uppercase tracking-widest mb-1">{badge}</Text>
              <Text className="text-white font-heading text-2xl font-black tracking-tight">{restaurant} — {title}</Text>
            </View>
            <View className="bg-white/20 border border-white/30 px-4 py-2 rounded-full">
              <Text className="text-white font-heading font-bold text-sm">Claim</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

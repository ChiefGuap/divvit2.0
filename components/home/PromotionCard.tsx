import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export function PromotionCard() {
  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-end px-2 mb-4">
        <Text className="text-xl font-heading font-extrabold tracking-tight text-on-surface">Promotions</Text>
        <TouchableOpacity className="px-2">
          <Text className="text-primary font-heading font-bold text-sm">See all</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity activeOpacity={0.9} className="relative overflow-hidden rounded-[2.5rem] h-48 bg-surface-container-highest">
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0HuJSPVx3n6Fyd0eTXi_VplR-BSQaX7jW4h6o97bEff6gAdmiRhXUtVNkvcrn-HrzNLtI9iC_F8z_WrpW7rootEduIGxlNGBpkwCChLV7eWO65JYFZn6AaCsHe9tgDrvsEv02wV3UE1yAwXHG7yeHfjTkp_4djmU5nsy3L--XAWWzkjgRjFfKwTriERWLmmkewjZHYAt5lBx_0H_sqdvqd2lqAyAhbYhtzgupnt6KI_oaNPCOQfvOyvbXyVrUOOF4qc5Mgeruh2w' }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/40 p-6 flex-col justify-end">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white/80 font-heading text-xs font-bold uppercase tracking-widest mb-1">Limited Offer</Text>
              <Text className="text-white font-heading text-2xl font-black tracking-tight">Panda Express BOGO</Text>
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

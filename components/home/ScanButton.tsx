import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ScanButtonProps {
    onPress?: () => void;
}

export const ScanButton = ({ onPress }: ScanButtonProps) => {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
    };

    return (
        <TouchableOpacity
            className="w-full h-40 rounded-3xl overflow-hidden mb-2 active:opacity-90"
            onPress={handlePress}
        >
            <LinearGradient
                colors={['#8A2BE2', '#6A0DAD']} // Purple gradient approximation
                // Using approximate hex codes because tailwind gradient support might vary or require config.
                // But since we have divvit-secondary #B54CFF, let's try to use that if possible or fall back to this.
                // Actually, let's use the explicit colors to match the "Purple gradient background" requirement closely.
                // The design shows a rich purple.
                className="w-full h-full justify-center items-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View className="border-2 border-white/30 p-3 rounded-2xl">
                    <Plus color="white" size={48} strokeWidth={2.5} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

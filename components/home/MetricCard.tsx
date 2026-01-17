import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface MetricCardProps {
    value: string;
    label: string;
    icon: LucideIcon;
    iconColor: string;
    info?: boolean;
}

export const MetricCard = ({ value, label, icon: Icon, iconColor, info }: MetricCardProps) => {
    return (
        <View className="flex-1 bg-divvit-card rounded-3xl p-5 items-center justify-between min-h-[140px] shadow-sm border border-white/5">
            <View className="w-full flex-row justify-between">
                <View />
                {/* Placeholder for left align if needed, creating space */}
                {info && (
                    <Text className="text-gray-400 text-xs absolute right-0 top-[-8]">ⓘ</Text>
                )}
            </View>

            <View className="items-center mb-2">
                <Icon size={36} color={iconColor} strokeWidth={1.5} />
            </View>

            <View className="items-center">
                <Text className="text-2xl font-heading font-bold text-divvit-text mb-1">{value}</Text>
                <Text className="text-gray-400 font-body text-xs text-center">{label}</Text>
            </View>
        </View>
    );
};

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
    totalSavings: string;
}

export default function QuickStatsCard({ totalSavings }: Props) {
    return (
        <View className="bg-primary p-6 rounded-3xl flex-col justify-between overflow-hidden relative mt-4">
            <View className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            
            <View className="relative z-10">
                <Text className="text-[10px] uppercase tracking-[0.2em] font-bold text-white opacity-70">Total Savings</Text>
                <Text className="text-3xl font-extrabold mt-1 text-white">{totalSavings}</Text>
            </View>
            
            <TouchableOpacity className="relative z-10 mt-6 px-4 py-2 rounded-xl w-[40%] items-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Text className="text-xs font-bold text-white">View Rewards</Text>
            </TouchableOpacity>
        </View>
    );
}

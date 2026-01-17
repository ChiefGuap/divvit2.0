import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Receipt } from 'lucide-react-native';

interface ManualScanButtonProps {
    onPress?: () => void;
}

export const ManualScanButton = ({ onPress }: ManualScanButtonProps) => {
    return (
        <TouchableOpacity
            className="flex-row items-center w-full bg-[#E8D9FF] p-4 rounded-2xl mb-4 active:opacity-80"
            onPress={onPress}
        >
            <View className="mr-4">
                <Receipt color="#1A1A1A" size={32} />
            </View>
            <View>
                <Text className="text-divvit-dark text-lg font-heading font-bold">Manual Scan</Text>
                <Text className="text-divvit-dark/70 font-body text-xs">For those that just need to split</Text>
            </View>
        </TouchableOpacity>
    );
};

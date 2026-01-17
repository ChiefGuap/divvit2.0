import React from 'react';
import { View, Text } from 'react-native';
import { Receipt } from 'lucide-react-native';

interface BillListItemProps {
    title: string;
    subtitle: string;
}

export const BillListItem = ({ title, subtitle }: BillListItemProps) => {
    return (
        <View className="flex-row items-center py-3 border-b border-white/10 last:border-0">
            <View className="mr-3">
                <Receipt size={20} color="#888" />
            </View>
            <View>
                <Text className="text-divvit-text font-heading font-semibold text-sm">{title}</Text>
                <Text className="text-gray-400 font-body text-xs mt-0.5">{subtitle}</Text>
            </View>
        </View>
    );
};

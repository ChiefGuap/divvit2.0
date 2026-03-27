import React from 'react';
import { View, Text } from 'react-native';

type Props = {
    subtotal: number;
    tax: number;
    dueNow: number;
};

export default function TotalsCard({ subtotal, tax, dueNow }: Props) {
    return (
        <View className="bg-surface-container-low p-6 rounded-[32px] mb-4">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-on-surface-variant font-medium text-sm">Subtotal</Text>
                <Text className="font-bold text-on-surface text-base">${subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-on-surface-variant font-medium text-sm">Tax</Text>
                <Text className="font-bold text-on-surface text-base">${tax.toFixed(2)}</Text>
            </View>
            <View className="pt-4 border-t border-[#cac4d6]/30 flex-row justify-between items-end">
                <Text className="text-on-surface-variant text-sm pb-1">Due Now</Text>
                <Text className="text-4xl font-heading font-extrabold tracking-tighter text-primary">
                    ${dueNow.toFixed(2)}
                </Text>
            </View>
        </View>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

type Props = {
    tipLabel: string;
    tipAmount: number;
    total: number;
    onContinue: () => void;
    isLoading?: boolean;
};

export default function FinalCalculationSurface({ tipLabel, tipAmount, total, onContinue, isLoading = false }: Props) {
    return (
        <View className="bg-[#dce2f7]/30 rounded-[40px] p-8 mt-2 mb-4">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-on-surface-variant font-medium">Selected Tip ({tipLabel})</Text>
                <Text className="font-bold text-on-surface">${tipAmount.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-on-surface-variant font-medium">Total</Text>
                <Text className="font-heading text-2xl font-bold text-on-surface">${total.toFixed(2)}</Text>
            </View>

            <View className="pt-6 border-t border-[#cac4d6]/50" style={{ paddingHorizontal: 16, width: '100%' }}>
                <TouchableOpacity
                    onPress={onContinue}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={{
                        width: '100%',
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#4b29b4',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 24,
                        overflow: 'hidden',
                    }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <>
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                                Continue to Pay
                            </Text>
                            <ArrowRight color="#FFFFFF" size={20} />
                        </>
                    )}
                </TouchableOpacity>
                <Text className="text-center text-[11px] text-on-surface-variant mt-4 font-medium uppercase tracking-tighter">
                    Secure payment via Divvit Pay
                </Text>
            </View>
        </View>
    );
}

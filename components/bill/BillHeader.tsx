import React, { useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const AnimatedNumber = ({ value, className, style }: { value: number; className?: string; style?: any }) => {
    const animatedValue = useSharedValue(value);

    useEffect(() => {
        animatedValue.value = withTiming(value, { duration: 500 });
    }, [value]);

    const animatedProps = useAnimatedProps(() => {
        return {
            text: `$${animatedValue.value.toFixed(2)}`,
        } as any;
    });

    return (
        <AnimatedTextInput
            underlineColorAndroid="transparent"
            editable={false}
            value={`$${value.toFixed(2)}`}
            animatedProps={animatedProps}
            className={className}
            style={style}
        />
    );
};

interface Props {
    subtotal: number;
    taxAmount: number;
    taxInput: string;
    setTaxInput(val: string): void;
    setTaxAmount(val: number): void;
    billTotal: number;
    progressSegments: { width: number; color: string; id: string }[];
}

export default function BillHeader({ subtotal, taxAmount, taxInput, setTaxInput, setTaxAmount, billTotal, progressSegments }: Props) {
    return (
        <View className="mb-8 mt-2">
            <View className="flex-row justify-between items-end mb-6">
                <View className="flex-1 flex-shrink mr-4">
                    <Text className="font-semibold text-on-surface-variant uppercase tracking-widest text-[11px] mb-1">Subtotal (pre-tip)</Text>
                    <Text className="text-4xl font-extrabold tracking-tight text-on-surface">${subtotal.toFixed(2)}</Text>
                </View>
                {/* Right side: Tax + Total, using a fixed 2-column grid so both rows align */}
                <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                    {/* Tax Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: '#6B7280', fontSize: 14, marginRight: 8 }}>Tax</Text>
                        {/* Value column — fixed width so $ and digits always line up */}
                        <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <TextInput
                                value={taxInput ? `$${taxInput}` : (taxAmount > 0 ? `$${taxAmount.toFixed(2)}` : '')}
                                onChangeText={(text) => {
                                    const cleaned = text.replace(/[^0-9.]/g, '');
                                    setTaxInput(cleaned);
                                    setTaxAmount(parseFloat(cleaned) || 0);
                                }}
                                onBlur={() => setTaxInput('')}
                                placeholder="$0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                                style={{ fontSize: 14, fontWeight: '500', color: '#111827', textAlign: 'right', minWidth: 50, padding: 0 }}
                            />
                        </View>
                    </View>

                    {/* Total Row — same value-column width so $ aligns directly below Tax $ */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#4b29b4', marginRight: 8 }}>Total</Text>
                        <View style={{ width: 80, alignItems: 'flex-end' }}>
                            <AnimatedNumber
                                value={billTotal}
                                style={{ fontSize: 20, fontWeight: '800', color: '#4b29b4', textAlign: 'right' }}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Visual Divider / Decoration */}
            <View className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden flex-row">
                {progressSegments.length > 0 ? progressSegments.map(segment => (
                    <View
                        key={segment.id}
                        className="h-full"
                        style={{ width: `${segment.width}%`, backgroundColor: segment.color }}
                    />
                )) : (
                    <View className="h-full bg-gray-200 w-full" />
                )}
            </View>
        </View>
    );
}

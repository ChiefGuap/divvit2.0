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
                    <Text className="font-semibold text-on-surface-variant uppercase tracking-widest text-[11px] mb-1">Subtotal</Text>
                    <Text className="text-4xl font-extrabold tracking-tight text-on-surface">${subtotal.toFixed(2)}</Text>
                </View>
                <View className="items-end">
                    <View className="flex-row items-center mb-1">
                        <Text className="text-on-surface-variant text-sm mr-1">Tax</Text>
                        <Text className="font-medium text-sm text-on-surface">$</Text>
                        <TextInput
                            value={taxInput || (taxAmount > 0 ? taxAmount.toFixed(2) : '')}
                            onChangeText={(text) => {
                                const cleaned = text.replace(/[^0-9.]/g, '');
                                setTaxInput(cleaned);
                                setTaxAmount(parseFloat(cleaned) || 0);
                            }}
                            onBlur={() => setTaxInput('')}
                            placeholder="$0.00"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="decimal-pad"
                            className="font-medium text-sm text-on-surface min-w-[40px] text-right"
                        />
                    </View>
                    <View className="flex-row items-center">
                        <Text className="text-xl font-bold text-primary mr-1">Total</Text>
                        <AnimatedNumber
                            value={billTotal}
                            className="text-xl font-bold text-primary"
                        />
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

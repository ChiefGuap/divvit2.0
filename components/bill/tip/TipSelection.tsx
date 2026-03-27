import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Edit2, Sparkles } from 'lucide-react-native';

type TipOption = { value: number; label: string };

type Props = {
    tipBaseAmount: number;
    selectedPercentage: number | null;
    customTip: string;
    noTip: boolean;
    onSelectPercentage: (val: number) => void;
    onCustomChange: (val: string) => void;
    isScannedTipActive: boolean;
    tipPercentages: TipOption[];
};

export default function TipSelection({
    tipBaseAmount,
    selectedPercentage,
    customTip,
    noTip,
    onSelectPercentage,
    onCustomChange,
    isScannedTipActive,
    tipPercentages
}: Props) {
    const inputRef = useRef<TextInput>(null);
    const isCustomActive = !selectedPercentage && !!customTip && !noTip;

    return (
        <View className="mb-3">
            <Text className="text-sm font-heading font-extrabold uppercase tracking-widest text-on-surface-variant mb-6 px-2">
                Choose a Tip
            </Text>

            {/* Cards grid — paddingTop reserves space for the MOST COMMON badge */}
            <View className="flex-row flex-wrap justify-between" style={{ opacity: noTip ? 0.4 : 1, paddingTop: 14 }}>
                {tipPercentages.map((tip) => {
                    const isSelected = selectedPercentage === tip.value && !noTip;
                    const isMostCommon = tip.value === 0.18;
                    const isScannedMatch = isScannedTipActive && isSelected;

                    return (
                        <TouchableOpacity
                            key={tip.label}
                            disabled={noTip}
                            onPress={() => onSelectPercentage(tip.value)}
                            activeOpacity={0.7}
                            className={`w-[48%] mb-3 p-5 rounded-3xl items-center justify-center border-2 ${
                                isSelected ? 'bg-primary-container border-primary' : 'bg-surface-container-low border-transparent'
                            }`}
                            style={[
                                { minHeight: 96 },
                                isSelected ? {
                                    shadowColor: '#4b29b4',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    elevation: 5,
                                } : undefined
                            ]}
                        >
                            {/* MOST COMMON badge — absolutely positioned above the card */}
                            {isMostCommon && isSelected && (
                                <View style={{ position: 'absolute', top: -14, left: 0, right: 0, alignItems: 'center' }}>
                                    <View className="bg-on-primary px-2 py-0.5 rounded-full">
                                        <Text className="text-primary text-[10px] font-bold">MOST COMMON</Text>
                                    </View>
                                </View>
                            )}

                            <Text className={`text-xs font-bold mb-1 ${isSelected ? 'text-on-primary opacity-80' : 'text-on-surface-variant'}`}>
                                {tip.label}
                            </Text>
                            <Text className={`text-xl font-heading font-extrabold tracking-tight ${isSelected ? 'text-on-primary' : 'text-on-surface'}`}>
                                ${(tipBaseAmount * tip.value).toFixed(2)}
                            </Text>

                            {isScannedMatch && (
                                <View className="flex-row items-center mt-2 bg-on-primary/20 px-2 py-0.5 rounded-full">
                                    <Sparkles size={10} color="#ffffff" />
                                    <Text className="text-white text-[10px] font-bold ml-1">From receipt</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* Custom Tip card */}
                <TouchableOpacity
                    disabled={noTip}
                    onPress={() => inputRef.current?.focus()}
                    activeOpacity={0.7}
                    className={`w-[48%] mb-3 p-5 rounded-3xl items-center justify-center border-2 ${
                        isCustomActive ? 'bg-primary-container border-primary' : 'bg-surface-container-low border-transparent'
                    }`}
                    style={[
                        { minHeight: 96 },
                        isCustomActive ? {
                            shadowColor: '#4b29b4',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 5,
                        } : undefined
                    ]}
                >
                    <View className="items-center w-full">
                        {/* Icon + label shown when NOT active */}
                        {!isCustomActive && (
                            <>
                                <Edit2 size={24} color="#4b29b4" style={{ marginBottom: 4 }} />
                                <Text className="text-sm font-bold text-on-surface">Custom</Text>
                            </>
                        )}

                        {/* Label shown above input when active */}
                        {isCustomActive && (
                            <Text className="text-xs font-bold mb-1 text-on-primary opacity-80">Custom</Text>
                        )}

                        {/*
                         * SINGLE always-mounted TextInput.
                         * Toggling its style (visible vs zero-size hidden) instead of
                         * unmounting/remounting prevents iOS from dismissing the keyboard
                         * when the first character is typed and the parent re-renders.
                         */}
                        <TextInput
                            ref={inputRef}
                            value={customTip}
                            onChangeText={onCustomChange}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                            editable={!noTip}
                            className="text-xl font-heading font-extrabold text-on-primary text-center w-full"
                            style={isCustomActive
                                ? { padding: 0 }
                                : { position: 'absolute', width: 0, height: 0, opacity: 0 }
                            }
                        />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

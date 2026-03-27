import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Columns, Shuffle, Trash2 } from 'lucide-react-native';

interface Props {
    onSplitEvenly: () => void;
    onRandomize: () => void;
    onClear: () => void;
}

export default function QuickActionsGrid({ onSplitEvenly, onRandomize, onClear }: Props) {
    return (
        <View className="mt-6 bg-surface-container-low rounded-2xl p-4 flex-row gap-3">
            <TouchableOpacity onPress={onSplitEvenly} activeOpacity={0.8} className="flex-1 py-4 items-center">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }}>
                    <Columns color="#4b29b4" size={20} />
                </View>
                <Text className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant text-center">Split Evenly</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onRandomize} activeOpacity={0.8} className="flex-1 py-4 items-center">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }}>
                    <Shuffle color="#4b29b4" size={20} />
                </View>
                <Text className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant text-center">Randomize</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClear} activeOpacity={0.8} className="flex-1 py-4 items-center">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }}>
                    <Trash2 color="#ba1a1a" size={20} />
                </View>
                <Text className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant text-center">Clear</Text>
            </TouchableOpacity>
        </View>
    );
}

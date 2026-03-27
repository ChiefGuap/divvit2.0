import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Animated, { Layout, FadeInDown } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Utensils, Trash2 } from 'lucide-react-native';

interface User {
    id: string;
    name: string;
    avatar: string;
    color: string;
    initials: string;
}

interface BillItem {
    id: string;
    name: string;
    price: number;
}

interface Props {
    item: BillItem;
    index: number;
    priceInput: string;
    uniqueAssignees: string[];
    activeUsers: User[];
    onNameChange: (text: string) => void;
    onPriceChange: (text: string) => void;
    onPriceBlur: () => void;
    onAssignToggle: () => void;
    onDelete: () => void;
    setSwipeableRef: (ref: Swipeable | null) => void;
}

const RenderRightActions = ({ onDelete }: { onDelete: () => void }) => {
    return (
        <TouchableOpacity
            onPress={onDelete}
            activeOpacity={0.8}
            className="bg-error justify-center items-center px-6 rounded-r-xl h-full -ml-4"
        >
            <Trash2 size={20} color="white" />
        </TouchableOpacity>
    );
};

export default function BillItemCard({ 
    item, index, priceInput, uniqueAssignees, activeUsers, 
    onNameChange, onPriceChange, onPriceBlur, onAssignToggle, onDelete, setSwipeableRef 
}: Props) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * 30).springify()}
            layout={Layout.springify()}
            className="mb-3"
        >
            <Swipeable
                ref={setSwipeableRef}
                renderRightActions={() => <RenderRightActions onDelete={onDelete} />}
                overshootRight={false}
                friction={2}
            >
                <TouchableOpacity 
                    onPress={onAssignToggle}
                    activeOpacity={0.9} 
                    className="bg-surface-container-lowest p-5 rounded-xl flex-row items-center justify-between w-full"
                >
                    <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 rounded-xl bg-surface-container-low items-center justify-center mr-4">
                            <Utensils color="#4b29b4" size={24} />
                        </View>
                        <View className="flex-1 mr-2">
                            <TextInput
                                value={item.name}
                                onChangeText={onNameChange}
                                placeholder="Item name..."
                                placeholderTextColor="#9CA3AF"
                                className="font-bold text-base text-on-surface"
                                style={{ padding: 0, margin: 0 }}
                                returnKeyType="next"
                            />
                            <Text className="text-xs text-on-surface-variant font-medium mt-0.5">
                                {uniqueAssignees.length > 0 ? `Shared by ${uniqueAssignees.length}` : 'Tap to assign'}
                            </Text>
                        </View>
                    </View>

                    <View className="items-end">
                        <View className="flex-row items-center">
                            <Text className="font-bold text-on-surface" style={{ fontSize: 16 }}>$</Text>
                            <TextInput
                                value={priceInput !== undefined ? priceInput : (item.price > 0 ? item.price.toString() : '')}
                                onChangeText={onPriceChange}
                                onBlur={onPriceBlur}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                                returnKeyType="done"
                                className="font-bold text-on-surface min-w-[36px]"
                                style={{ padding: 0, margin: 0, fontSize: 16 }}
                            />
                        </View>
                        
                        {uniqueAssignees.length > 0 && (
                            <View className="flex-row mt-1 justify-end">
                                {uniqueAssignees.slice(0, 3).map((uid, idx) => {
                                    const u = activeUsers.find(usr => usr.id === uid);
                                    if (!u) return null;
                                    return (
                                        <View
                                            key={uid}
                                            className="w-6 h-6 rounded-full border-2 border-surface-container-lowest items-center justify-center"
                                            style={{ backgroundColor: u.color, zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -8 }}
                                        >
                                            <Text className="font-bold text-white text-[8px]">{u.initials}</Text>
                                        </View>
                                    )
                                })}
                                {uniqueAssignees.length > 3 && (
                                    <View className="w-6 h-6 rounded-full bg-primary-container border-2 border-surface-container-lowest items-center justify-center" style={{ zIndex: 0, marginLeft: -8 }}>
                                        <Text className="font-bold text-white text-[10px]">+{uniqueAssignees.length - 3}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Swipeable>
        </Animated.View>
    );
}

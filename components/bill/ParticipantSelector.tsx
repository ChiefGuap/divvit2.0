import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Check, UserPlus } from 'lucide-react-native';

interface User {
    id: string;
    name: string;
    avatar: string;
    color: string;
    initials: string;
}

interface Props {
    activeUsers: User[];
    selectedUserIds: string[];
    onSelectUser: (id: string) => void;
    onAddUser?: () => void;
}

export default function ParticipantSelector({ activeUsers, selectedUserIds, onSelectUser, onAddUser }: Props) {
    const selectedCount = selectedUserIds.length;
    const label = selectedCount === 0
        ? 'Tap a person to start'
        : selectedCount === 1
            ? 'Assigning to'
            : `Assigning to ${selectedCount} people (split evenly)`;

    return (
        <View className="mt-8 pb-4">
            <Text className="font-semibold text-on-surface-variant uppercase tracking-widest text-[11px] mb-4">{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                <View className="flex-row items-center gap-3">
                    {activeUsers.map(user => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                            <TouchableOpacity
                                key={user.id}
                                onPress={() => onSelectUser(user.id)}
                                activeOpacity={0.8}
                                className="relative"
                                style={{ overflow: 'visible' }}
                            >
                                <View
                                    className={`w-14 h-14 rounded-full items-center justify-center ${isSelected ? 'border-2 border-primary' : 'opacity-60'}`}
                                    style={{ backgroundColor: user.color }}
                                >
                                    <Text className="font-bold text-white text-lg">{user.initials}</Text>
                                </View>
                                {isSelected && (
                                    <View style={{
                                        position: 'absolute',
                                        bottom: -2,
                                        left: -2,
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: '#4b29b4',
                                        borderWidth: 2,
                                        borderColor: '#FFFFFF',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10,
                                    }}>
                                        <Check color="white" size={11} strokeWidth={4} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity onPress={onAddUser} activeOpacity={0.8} className="w-14 h-14 rounded-full bg-surface-container-high items-center justify-center border-2 border-dashed border-outline-variant">
                        <UserPlus color="#4b29b4" size={20} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

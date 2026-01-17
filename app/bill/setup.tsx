import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowRight, Plus, X, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/Button';
import '../../global.css';

type User = {
    id: string;
    name: string;
    avatar: string;
    color: string;
    initials: string;
};

// Keeping colors for OTHER users, but ensuring they fit the theme
const COLORS = [
    '#B54CFF', // Secondary Purple
    '#FF4C4C', // Red
    '#4CFFB5', // Mint
    '#FFB54C', // Orange
    '#4CB5FF', // Blue
    '#FF69B4', // Pink
];

export default function ParticipantSetupScreen() {
    const router = useRouter();
    const { billData } = useLocalSearchParams<{ billData: string }>();
    const [name, setName] = useState('');

    // Default "You" user - Purple for light theme
    const [participants, setParticipants] = useState<User[]>([
        {
            id: 'u1',
            name: 'You',
            avatar: 'https://i.pravatar.cc/150?u=u1',
            color: '#B54CFF',
            initials: 'ME'
        }
    ]);

    const handleAddUser = () => {
        if (!name.trim()) return;

        const newId = `u${participants.length + 1}-${Date.now()}`;
        // Cycle through colors
        const color = COLORS[(participants.length - 1) % COLORS.length];
        const initials = name.trim().slice(0, 2).toUpperCase();

        const newUser: User = {
            id: newId,
            name: name.trim(),
            avatar: `https://i.pravatar.cc/150?u=${newId}`,
            color: color,
            initials: initials
        };

        setParticipants([...participants, newUser]);
        setName('');
        Haptics.selectionAsync();
    };

    const handleRemoveUser = (id: string) => {
        if (id === 'u1') return; // Cannot remove 'You'
        setParticipants(participants.filter(p => p.id !== id));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleContinue = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        router.push({
            pathname: '/bill/[id]',
            params: {
                id: 'new',
                billData: billData,
                users: JSON.stringify(participants)
            }
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ headerShown: false }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 px-6 pt-10">
                    {/* Header */}
                    <View className="mb-10">
                        <View
                            className="w-12 h-12 bg-divvit-card rounded-xl items-center justify-center mb-4 border border-gray-200"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <Users size={24} color="#B54CFF" />
                        </View>
                        <Text className="text-divvit-text font-heading text-4xl leading-tight">
                            Who is splitting{'\n'}this bill?
                        </Text>
                        <Text className="text-divvit-muted font-body text-lg mt-2">
                            Add everyone who needs to pay.
                        </Text>
                    </View>

                    {/* Input Area */}
                    <View className="flex-row items-center mb-8 gap-3">
                        <View className="flex-1 h-14 bg-divvit-input-bg rounded-2xl border border-divvit-input-border justify-center px-4">
                            <TextInput
                                className="text-divvit-text font-body text-lg h-full"
                                placeholder="Add name (e.g. Alice)"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                returnKeyType="done"
                                onSubmitEditing={handleAddUser}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleAddUser}
                            className={`w-14 h-14 rounded-2xl items-center justify-center ${name.trim() ? 'bg-divvit-secondary' : 'bg-divvit-card border border-gray-200'}`}
                            disabled={!name.trim()}
                        >
                            <Plus size={24} color={name.trim() ? '#fff' : '#9CA3AF'} />
                        </TouchableOpacity>
                    </View>

                    {/* Participants List */}
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        <View className="gap-3 flex-row flex-wrap">
                            {participants.map((user) => (
                                <View
                                    key={user.id}
                                    className="flex-row items-center bg-white rounded-full pl-2 pr-4 py-2 border border-gray-200 self-start"
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 2,
                                        elevation: 1,
                                    }}
                                >
                                    <View
                                        className="w-8 h-8 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: user.color }}
                                    >
                                        <Text className="font-heading text-white text-xs">{user.initials}</Text>
                                    </View>
                                    <Text className="text-divvit-text font-medium text-base mr-2">{user.name}</Text>
                                    {user.id !== 'u1' && (
                                        <TouchableOpacity onPress={() => handleRemoveUser(user.id)}>
                                            <X size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer Button */}
                    <View className="pb-4 pt-4">
                        <TouchableOpacity
                            onPress={handleContinue}
                            className="bg-divvit-secondary rounded-3xl h-16 flex-row items-center justify-center space-x-2"
                            style={{
                                shadowColor: '#B54CFF',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5,
                            }}
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-heading text-lg font-bold">
                                Let's Split ({participants.length})
                            </Text>
                            <ArrowRight size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

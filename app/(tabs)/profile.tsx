import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogOut, Edit3, Check, X, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../types';

export default function ProfileScreen() {
    const router = useRouter();
    const { session, user, profile, signOut, refreshProfile } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [phone, setPhone] = useState('');
    const [venmoHandle, setVenmoHandle] = useState('');
    const [cashappHandle, setCashappHandle] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Initialize form values from profile
    useEffect(() => {
        if (profile) {
            setPhone(profile.phone || '');
            setVenmoHandle(profile.venmo_handle || '');
            setCashappHandle(profile.cashapp_handle || '');
        }
    }, [profile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    }, [refreshProfile]);

    const handleEdit = async () => {
        await Haptics.selectionAsync();
        setIsEditing(true);
    };

    const handleCancel = async () => {
        await Haptics.selectionAsync();
        // Reset to original values
        if (profile) {
            setPhone(profile.phone || '');
            setVenmoHandle(profile.venmo_handle || '');
            setCashappHandle(profile.cashapp_handle || '');
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!session?.user) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        setLoading(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${session.user.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify({
                        phone: phone || null,
                        venmo_handle: venmoHandle || null,
                        cashapp_handle: cashappHandle || null,
                        updated_at: new Date().toISOString(),
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to save: ${response.status}`);
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await refreshProfile();
            setIsEditing(false);
        } catch (error: any) {
            console.error('Profile: Save error:', error);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        await signOut();
                    },
                },
            ]
        );
    };

    // Get display values
    const displayName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'User'
        : 'User';
    const username = profile?.username || 'username';
    const initials = getInitials(displayName);

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                <Text className="text-2xl font-heading font-bold text-divvit-text">Profile</Text>
                {!isEditing ? (
                    <TouchableOpacity onPress={handleEdit} className="p-2">
                        <Edit3 size={22} color="#B54CFF" />
                    </TouchableOpacity>
                ) : (
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={handleCancel} className="p-2 mr-2">
                            <X size={22} color="#EF4444" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} disabled={loading} className="p-2">
                            {loading ? (
                                <ActivityIndicator size="small" color="#22C55E" />
                            ) : (
                                <Check size={22} color="#22C55E" />
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B54CFF" />
                }
            >
                {/* Avatar Section */}
                <View className="items-center py-8">
                    <View
                        className="w-24 h-24 rounded-full items-center justify-center mb-4"
                        style={{
                            backgroundColor: '#B54CFF',
                            shadowColor: '#B54CFF',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                    >
                        <Text className="text-white text-3xl font-bold">{initials}</Text>
                    </View>
                    <Text className="text-xl font-heading font-bold text-divvit-text">{displayName}</Text>
                    <Text className="text-divvit-muted font-body">@{username}</Text>
                </View>

                {/* Info Card */}
                <View className="mx-6 mb-6">
                    <View
                        className="bg-white rounded-2xl p-5 border border-gray-100"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <Text className="text-sm font-heading font-bold text-divvit-text mb-4">
                            Contact Info
                        </Text>

                        {/* Email (Read-only) */}
                        <View className="mb-4">
                            <Text className="text-xs text-divvit-muted font-body mb-1">Email</Text>
                            <Text className="text-divvit-text font-body">
                                {user?.email || 'No email set'}
                            </Text>
                        </View>

                        {/* Phone */}
                        <View className="mb-4">
                            <Text className="text-xs text-divvit-muted font-body mb-1">Phone</Text>
                            {isEditing ? (
                                <TextInput
                                    className="text-divvit-text font-body text-base bg-divvit-input-bg border border-divvit-input-border rounded-xl h-10 px-3"
                                    placeholder="Add phone number"
                                    placeholderTextColor="#9CA3AF"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            ) : (
                                <Text className="text-divvit-text font-body">
                                    {phone || 'Not set'}
                                </Text>
                            )}
                        </View>

                        {/* Country (Read-only) */}
                        {profile?.country && (
                            <View>
                                <Text className="text-xs text-divvit-muted font-body mb-1">Country</Text>
                                <Text className="text-divvit-text font-body">{profile.country}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Payment Accounts */}
                <View className="mx-6 mb-6">
                    <View
                        className="bg-white rounded-2xl p-5 border border-gray-100"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <Text className="text-sm font-heading font-bold text-divvit-text mb-4">
                            Payment Accounts
                        </Text>

                        {/* Venmo */}
                        <View className="flex-row items-center mb-4">
                            <View
                                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                                style={{ backgroundColor: '#008CFF' }}
                            >
                                <Text className="text-white font-bold">V</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-divvit-muted font-body">Venmo</Text>
                                {isEditing ? (
                                    <View className="flex-row items-center mt-1">
                                        <Text className="text-divvit-muted mr-1">@</Text>
                                        <TextInput
                                            className="flex-1 text-divvit-text font-body bg-divvit-input-bg border border-divvit-input-border rounded-xl h-9 px-2"
                                            placeholder="venmo_handle"
                                            placeholderTextColor="#9CA3AF"
                                            value={venmoHandle}
                                            onChangeText={setVenmoHandle}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                ) : (
                                    <Text className="text-divvit-text font-body">
                                        {venmoHandle ? `@${venmoHandle}` : 'Not connected'}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Cash App */}
                        <View className="flex-row items-center">
                            <View
                                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                                style={{ backgroundColor: '#00D632' }}
                            >
                                <DollarSign size={18} color="#FFFFFF" strokeWidth={3} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-divvit-muted font-body">Cash App</Text>
                                {isEditing ? (
                                    <View className="flex-row items-center mt-1">
                                        <Text className="text-divvit-muted mr-1">$</Text>
                                        <TextInput
                                            className="flex-1 text-divvit-text font-body bg-divvit-input-bg border border-divvit-input-border rounded-xl h-9 px-2"
                                            placeholder="cashtag"
                                            placeholderTextColor="#9CA3AF"
                                            value={cashappHandle}
                                            onChangeText={setCashappHandle}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                ) : (
                                    <Text className="text-divvit-text font-body">
                                        {cashappHandle ? `$${cashappHandle}` : 'Not connected'}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Log Out Button */}
                <View className="mx-6 mb-8">
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="flex-row items-center justify-center h-14 rounded-2xl border border-red-200 bg-red-50"
                        activeOpacity={0.7}
                    >
                        <LogOut size={20} color="#EF4444" />
                        <Text className="text-red-500 font-bold ml-2">Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <View className="items-center pb-8">
                    <Text className="text-divvit-muted text-xs">Divvit v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

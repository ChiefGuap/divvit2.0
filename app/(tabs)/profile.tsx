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
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogOut, Edit3, Check, X, Menu } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../types';

import ContactInfoCard from '../../components/profile/ContactInfoCard';
import PaymentAccountsCard from '../../components/profile/PaymentAccountsCard';
import QuickStatsCard from '../../components/profile/QuickStatsCard';

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
    // const username = profile?.username || 'username'; // Left off if unused
    const initials = getInitials(displayName);

    return (
        <SafeAreaView className="flex-1 bg-surface">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 h-16 w-full">
                <View className="flex-row items-center space-x-4">
                    <TouchableOpacity className="p-2 -ml-2 rounded-full active:scale-90" style={{ backgroundColor: 'rgba(99, 70, 205, 0.1)' }}>
                        <Menu color="#6346cd" size={24} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-extrabold text-primary tracking-tighter" style={{ fontFamily: 'Outfit_700Bold' }}>Divvit</Text>
                </View>
                <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-2" style={{ borderColor: 'rgba(75, 41, 180, 0.2)' }}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <Text className="text-white font-bold text-sm">{initials}</Text>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B54CFF" />
                }
            >
                <View className="max-w-2xl mx-auto w-full">
                    {/* Profile Header Section */}
                    <View className="mb-10 items-center">
                        <View className="relative mb-6">
                            <View 
                                className="w-32 h-32 rounded-3xl overflow-hidden shadow-xl border-4 border-surface-container-lowest"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 15,
                                    elevation: 10,
                                    transform: [{ rotate: '3deg' }]
                                }}
                            >
                                {profile?.avatar_url ? (
                                    <Image source={{ uri: profile.avatar_url }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="w-full h-full bg-primary items-center justify-center">
                                        <Text className="text-white text-4xl font-bold">{initials}</Text>
                                    </View>
                                )}
                            </View>
                            
                            {isEditing ? (
                                <View className="absolute -bottom-2 -right-12 flex-row space-x-2">
                                    <TouchableOpacity 
                                        onPress={handleCancel}
                                        className="bg-error w-10 h-10 rounded-xl items-center justify-center shadow-lg active:scale-95"
                                        disabled={loading}
                                    >
                                        <X color="#FFFFFF" size={20} />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={handleSave}
                                        className="bg-[#22C55E] w-10 h-10 rounded-xl items-center justify-center shadow-lg active:scale-95"
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Check color="#FFFFFF" size={20} />}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    onPress={handleEdit}
                                    className="absolute -bottom-2 -right-2 bg-primary w-10 h-10 rounded-xl items-center justify-center shadow-lg active:scale-95"
                                >
                                    <Edit3 color="#FFFFFF" size={20} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text className="text-3xl font-extrabold tracking-tight text-on-surface">{displayName}</Text>
                        <Text className="text-on-surface-variant font-medium mt-1 uppercase tracking-widest text-[11px]">Premium Member since 2023</Text>
                    </View>

                    {/* Profile Bento Grid */}
                    <View className="flex-col pb-8">
                        <ContactInfoCard
                            isEditing={isEditing}
                            email={user?.email || 'No email set'}
                            phone={phone}
                            setPhone={setPhone}
                            country={profile?.country || 'United States'}
                        />
                        
                        <PaymentAccountsCard
                            isEditing={isEditing}
                            venmoHandle={venmoHandle}
                            setVenmoHandle={setVenmoHandle}
                            cashappHandle={cashappHandle}
                            setCashappHandle={setCashappHandle}
                        />
                        
                        <QuickStatsCard totalSavings="$2,450.80" />

                        {/* Logout Action */}
                        <View className="mt-8 mb-12">
                            <TouchableOpacity 
                                onPress={handleLogout}
                                className="w-full flex-row items-center justify-center py-4 rounded-2xl active:scale-95"
                                style={{ backgroundColor: 'rgba(186, 26, 26, 0.05)' }}
                            >
                                <LogOut color="#ba1a1a" size={20} />
                                <Text className="text-error font-bold ml-2">Log Out</Text>
                            </TouchableOpacity>
                        </View>

                        {/* App Version */}
                        <View className="items-center pb-8 mt-4">
                            <Text className="text-on-surface-variant text-xs opacity-50 font-bold">Divvit v2.0.0</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Setup() {
    const router = useRouter();
    const { session, refreshProfile } = useAuth();
    const [username, setUsername] = useState('');
    const [venmo, setVenmo] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const handleSave = async () => {
        console.log('Setup: handleSave called');
        if (!username.trim()) {
            console.log('Setup: Validation Failed - No Username');
            Alert.alert("Required", "Please enter a username.");
            return;
        }
        if (!session?.user) {
            console.error('Setup: Error - No active session found during save');
            Alert.alert("Error", "No active session found.");
            return;
        }

        console.log('Setup: Saving profile for', session.user.id);
        setLoading(true);
        await Haptics.selectionAsync();

        try {
            // Use direct fetch instead of Supabase JS client (which hangs on web)
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Use upsert (POST with on_conflict) to handle both existing and missing profiles
            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates,return=representation'
                    },
                    body: JSON.stringify({
                        id: session.user.id, // Required for upsert
                        username: username,
                        venmo_handle: venmo || null,
                        updated_at: new Date().toISOString(),
                    })
                }
            );

            console.log('Setup: Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Setup: Error response:', errorText);
                throw new Error(`Failed to save: ${response.status}`);
            }

            const data = await response.json();
            console.log('Setup: Profile Saved Successfully via upsert', data);

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await refreshProfile();
            console.log('Setup: Profile Refreshed in Context');

            // DO NOT navigate manually - let the gatekeeper (NavigationController) handle it

        } catch (error: any) {
            console.error('Setup: Exception:', error);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", error.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFocus = (inputName: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFocusedInput(inputName);
    };

    const handleBlur = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFocusedInput(null);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white px-6 justify-center"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View className="mb-12">
                <Text className="text-3xl text-divvit-text font-heading font-bold mb-2">Set up your profile</Text>
                <Text className="text-divvit-muted font-body text-sm">Help your friends find you on Divvit.</Text>
            </View>

            {/* Form */}
            <View className="gap-6 mb-8">
                {/* Username Input */}
                <View>
                    <Text className={`text-sm mb-2 font-body font-medium ${focusedInput === 'username' ? 'text-divvit-secondary' : 'text-divvit-muted'}`}>
                        Username
                    </Text>
                    <View className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${focusedInput === 'username' ? 'border-divvit-secondary' : 'border-divvit-input-border'}`}>
                        <TextInput
                            className="text-divvit-text font-body text-base h-full"
                            placeholder="@username"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            value={username}
                            onChangeText={setUsername}
                            onFocus={() => handleFocus('username')}
                            onBlur={handleBlur}
                        />
                    </View>
                </View>

                {/* Venmo Input */}
                <View>
                    <Text className={`text-sm mb-2 font-body font-medium ${focusedInput === 'venmo' ? 'text-divvit-secondary' : 'text-divvit-muted'}`}>
                        Venmo Handle (Optional)
                    </Text>
                    <View className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${focusedInput === 'venmo' ? 'border-divvit-secondary' : 'border-divvit-input-border'}`}>
                        <TextInput
                            className="text-divvit-text font-body text-base h-full"
                            placeholder="@venmo_handle"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            value={venmo}
                            onChangeText={setVenmo}
                            onFocus={() => handleFocus('venmo')}
                            onBlur={handleBlur}
                        />
                    </View>
                </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                className="bg-divvit-secondary h-14 rounded-2xl items-center justify-center mb-8"
                style={{
                    shadowColor: '#B54CFF',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                }}
                activeOpacity={0.8}
            >
                {loading ? (
                    <Text className="text-white font-bold text-lg">Saving...</Text>
                ) : (
                    <Text className="text-white font-bold text-lg">Complete Setup</Text>
                )}
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

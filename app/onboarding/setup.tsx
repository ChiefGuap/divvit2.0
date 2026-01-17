import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Check, X, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';

// Debounce hook for username check
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function SetupProfileScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        firstName: string;
        lastName: string;
        phone: string;
        country: string;
        dob: string;
    }>();
    const { session, user, refreshProfile } = useAuth();

    const [username, setUsername] = useState('');
    const [venmoHandle, setVenmoHandle] = useState('');
    const [cashappHandle, setCashappHandle] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState('');
    const [showVenmoModal, setShowVenmoModal] = useState(false);
    const [showCashAppModal, setShowCashAppModal] = useState(false);
    const [tempHandle, setTempHandle] = useState('');
    const [loading, setLoading] = useState(false);

    const debouncedUsername = useDebounce(username, 500);

    // Check username availability
    useEffect(() => {
        const checkUsername = async () => {
            if (!debouncedUsername || debouncedUsername.length < 3) {
                setUsernameAvailable(null);
                setUsernameError(debouncedUsername.length > 0 && debouncedUsername.length < 3 ? 'Username must be at least 3 characters' : '');
                return;
            }

            // Validate format
            if (!/^[a-zA-Z0-9_]+$/.test(debouncedUsername)) {
                setUsernameAvailable(false);
                setUsernameError('Only letters, numbers, and underscores allowed');
                return;
            }

            setIsCheckingUsername(true);
            setUsernameError('');

            try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

                const response = await fetch(
                    `${supabaseUrl}/rest/v1/profiles?username=eq.${debouncedUsername}&select=id`,
                    {
                        headers: {
                            'apikey': supabaseKey!,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const data = await response.json();
                setUsernameAvailable(data.length === 0);
                if (data.length > 0) {
                    setUsernameError('Username already taken');
                }
            } catch (error) {
                console.error('Error checking username:', error);
                setUsernameError('Could not verify username');
            } finally {
                setIsCheckingUsername(false);
            }
        };

        checkUsername();
    }, [debouncedUsername]);

    const handleBack = async () => {
        await Haptics.selectionAsync();
        router.back();
    };

    const handleFinish = async () => {
        if (!username.trim() || username.length < 3) {
            Alert.alert('Username Required', 'Please enter a username with at least 3 characters.');
            return;
        }

        if (usernameAvailable === false) {
            Alert.alert('Username Unavailable', 'Please choose a different username.');
            return;
        }

        if (!session?.user) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        setLoading(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Build profile data with user ID for upsert
            const profileData: Record<string, any> = {
                id: session.user.id, // Required for upsert
                username: username.trim(),
                first_name: params.firstName || null,
                last_name: params.lastName || null,
                phone: params.phone || null,
                country: params.country || null,
                dob: params.dob ? new Date(params.dob).toISOString().split('T')[0] : null,
                venmo_handle: venmoHandle || null,
                cashapp_handle: cashappHandle || null,
                has_onboarded: true,
                updated_at: new Date().toISOString(),
            };

            // Use upsert (POST with on_conflict) to handle both existing and missing profiles
            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates,return=representation',
                    },
                    body: JSON.stringify(profileData),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Setup: Error response:', errorText);
                throw new Error(`Failed to save: ${response.status}`);
            }

            console.log('Setup: Profile saved successfully via upsert');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Refresh profile - the NavigationController will detect hasOnboarded and redirect
            await refreshProfile();

            // DO NOT navigate manually - let the gatekeeper (NavigationController) handle it
            // The refreshProfile() call will update hasOnboarded, triggering navigation
        } catch (error: any) {
            console.error('Setup: Exception:', error);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectVenmo = () => {
        setTempHandle(venmoHandle);
        setShowVenmoModal(true);
    };

    const handleConnectCashApp = () => {
        setTempHandle(cashappHandle);
        setShowCashAppModal(true);
    };

    const saveVenmoHandle = async () => {
        await Haptics.selectionAsync();
        setVenmoHandle(tempHandle);
        setShowVenmoModal(false);
    };

    const saveCashAppHandle = async () => {
        await Haptics.selectionAsync();
        setCashappHandle(tempHandle);
        setShowCashAppModal(false);
    };

    const renderUsernameStatus = () => {
        if (isCheckingUsername) {
            return <ActivityIndicator size="small" color="#B54CFF" />;
        }
        if (usernameAvailable === true && username.length >= 3) {
            return <Check size={20} color="#22C55E" />;
        }
        if (usernameAvailable === false) {
            return <X size={20} color="#EF4444" />;
        }
        return null;
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center px-6 py-4">
                <TouchableOpacity onPress={handleBack} className="mr-4">
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xs text-divvit-muted font-body">Step 2 of 2</Text>
                    <Text className="text-lg font-heading font-bold text-divvit-text">Setup Profile</Text>
                </View>
            </View>

            <KeyboardAwareScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                extraScrollHeight={120}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <View className="mb-8 mt-4">
                    <Text className="text-2xl font-heading font-bold text-divvit-text mb-2">
                        Create your profile
                    </Text>
                    <Text className="text-divvit-muted font-body text-sm">
                        Choose a username and connect your payment apps.
                    </Text>
                </View>

                {/* Form */}
                <View className="gap-6">
                    {/* Username Input */}
                    <View>
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Username
                        </Text>
                        <View
                            className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 flex-row items-center ${usernameError ? 'border-red-500' : usernameAvailable === true && username.length >= 3 ? 'border-green-500' : 'border-divvit-input-border'
                                }`}
                        >
                            <Text className="text-divvit-muted font-body text-base mr-1">@</Text>
                            <TextInput
                                className="flex-1 text-divvit-text font-body text-base h-full"
                                placeholder="choose_username"
                                placeholderTextColor="#9CA3AF"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <View className="w-6 items-center">
                                {renderUsernameStatus()}
                            </View>
                        </View>
                        {usernameError && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{usernameError}</Text>
                        )}
                        {usernameAvailable === true && username.length >= 3 && (
                            <Text className="text-green-500 text-xs mt-1 ml-1">Username available!</Text>
                        )}
                    </View>

                    {/* Payment Connections */}
                    <View className="mt-2">
                        <Text className="text-sm mb-3 font-body font-medium text-divvit-muted">
                            Payment Apps (Optional)
                        </Text>

                        {/* Venmo Button */}
                        <TouchableOpacity
                            onPress={handleConnectVenmo}
                            className={`flex-row items-center h-14 px-4 rounded-2xl border mb-3 ${venmoHandle ? 'bg-blue-50 border-blue-300' : 'bg-divvit-input-bg border-divvit-input-border'
                                }`}
                            activeOpacity={0.7}
                        >
                            <View
                                className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                                style={{ backgroundColor: '#008CFF' }}
                            >
                                <Text className="text-white font-bold text-sm">V</Text>
                            </View>
                            <View className="flex-1">
                                {venmoHandle ? (
                                    <>
                                        <Text className="text-divvit-text font-body font-medium">Venmo Connected</Text>
                                        <Text className="text-divvit-muted text-xs">@{venmoHandle}</Text>
                                    </>
                                ) : (
                                    <Text className="text-divvit-text font-body">Connect Venmo</Text>
                                )}
                            </View>
                            {venmoHandle && <Check size={20} color="#22C55E" />}
                        </TouchableOpacity>

                        {/* Cash App Button */}
                        <TouchableOpacity
                            onPress={handleConnectCashApp}
                            className={`flex-row items-center h-14 px-4 rounded-2xl border ${cashappHandle ? 'bg-green-50 border-green-300' : 'bg-divvit-input-bg border-divvit-input-border'
                                }`}
                            activeOpacity={0.7}
                        >
                            <View
                                className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                                style={{ backgroundColor: '#00D632' }}
                            >
                                <DollarSign size={18} color="#FFFFFF" strokeWidth={3} />
                            </View>
                            <View className="flex-1">
                                {cashappHandle ? (
                                    <>
                                        <Text className="text-divvit-text font-body font-medium">Cash App Connected</Text>
                                        <Text className="text-divvit-muted text-xs">${cashappHandle}</Text>
                                    </>
                                ) : (
                                    <Text className="text-divvit-text font-body">Connect Cash App</Text>
                                )}
                            </View>
                            {cashappHandle && <Check size={20} color="#22C55E" />}
                        </TouchableOpacity>

                        <Text className="text-divvit-muted text-xs mt-2 text-center">
                            You can always add these later in Profile settings
                        </Text>
                    </View>
                </View>

                {/* Finish Button */}
                <View className="px-6 pb-8 pt-4 bg-white">
                    <TouchableOpacity
                        onPress={handleFinish}
                        disabled={loading || !username.trim() || usernameAvailable === false}
                        className={`h-14 rounded-2xl items-center justify-center ${loading || !username.trim() || usernameAvailable === false
                            ? 'bg-gray-300'
                            : 'bg-divvit-secondary'
                            }`}
                        style={
                            !loading && username.trim() && usernameAvailable !== false
                                ? {
                                    shadowColor: '#B54CFF',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 5,
                                }
                                : {}
                        }
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Finish</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>

            {/* Venmo Modal */}
            <Modal
                visible={showVenmoModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowVenmoModal(false)}>
                            <Text className="text-divvit-muted font-body">Cancel</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-heading font-bold text-divvit-text">
                            Connect Venmo
                        </Text>
                        <TouchableOpacity onPress={saveVenmoHandle}>
                            <Text className="text-divvit-secondary font-body font-medium">Save</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1 px-6 pt-8">
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Venmo Username
                        </Text>
                        <View className="bg-divvit-input-bg border border-divvit-input-border rounded-2xl h-14 px-4 flex-row items-center">
                            <Text className="text-divvit-muted font-body text-base mr-1">@</Text>
                            <TextInput
                                className="flex-1 text-divvit-text font-body text-base h-full"
                                placeholder="your_venmo_handle"
                                placeholderTextColor="#9CA3AF"
                                value={tempHandle}
                                onChangeText={setTempHandle}
                                autoCapitalize="none"
                                autoFocus
                            />
                        </View>
                        <Text className="text-divvit-muted text-xs mt-2">
                            Enter your Venmo username without the @ symbol
                        </Text>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Cash App Modal */}
            <Modal
                visible={showCashAppModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowCashAppModal(false)}>
                            <Text className="text-divvit-muted font-body">Cancel</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-heading font-bold text-divvit-text">
                            Connect Cash App
                        </Text>
                        <TouchableOpacity onPress={saveCashAppHandle}>
                            <Text className="text-divvit-secondary font-body font-medium">Save</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1 px-6 pt-8">
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Cash App Username
                        </Text>
                        <View className="bg-divvit-input-bg border border-divvit-input-border rounded-2xl h-14 px-4 flex-row items-center">
                            <Text className="text-divvit-muted font-body text-base mr-1">$</Text>
                            <TextInput
                                className="flex-1 text-divvit-text font-body text-base h-full"
                                placeholder="your_cashtag"
                                placeholderTextColor="#9CA3AF"
                                value={tempHandle}
                                onChangeText={setTempHandle}
                                autoCapitalize="none"
                                autoFocus
                            />
                        </View>
                        <Text className="text-divvit-muted text-xs mt-2">
                            Enter your $cashtag without the $ symbol
                        </Text>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

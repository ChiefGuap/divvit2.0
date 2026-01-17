import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { MoveRight } from 'lucide-react-native';
import { getAuthCallbackUrl } from '../../utils/url';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const handleLogin = async () => {
        if (loading) return;
        setLoading(true);

        try {
            await Haptics.selectionAsync();

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Login Error:', error);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Login Failed', error.message);
            } else {
                console.log('Login Success');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                // Router redirection is handled by AuthContext
            }
        } catch (e: any) {
            console.error('Login Exception:', e);
            Alert.alert('Error', e.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);
        console.log('Google Login Pressed');
        try {
            await Haptics.selectionAsync();
            const redirectUrl = getAuthCallbackUrl();
            console.log('OAuth redirectTo:', redirectUrl);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true, // Fix for iOS popup behavior
                },
            });

            if (error) {
                console.error('Google Auth Error:', error);
                Alert.alert('Google Auth Failed', error.message);
            } else if (data?.url) {
                console.log('Opening Supabase URL:', data.url);
                await Linking.openURL(data.url);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
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
            <View className="items-center mb-12">
                <View className="mb-4">
                    <Text className="text-divvit-secondary text-5xl font-heading font-thin">D</Text>
                </View>
                <Text className="text-3xl text-divvit-text font-heading font-bold mb-2">Login to your account</Text>
                <Text className="text-divvit-muted font-body text-sm">Let's start splitting with Divvy!</Text>
            </View>

            {/* Form */}
            <View className="gap-6 mb-8">
                {/* Email Input */}
                <View>
                    <Text className={`text-sm mb-2 font-body font-medium ${focusedInput === 'email' ? 'text-divvit-secondary' : 'text-divvit-muted'}`}>
                        E-mail
                    </Text>
                    <View className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${focusedInput === 'email' ? 'border-divvit-secondary' : 'border-divvit-input-border'}`}>
                        <TextInput
                            className="text-divvit-text font-body text-base h-full"
                            placeholder="example@email.com"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => handleFocus('email')}
                            onBlur={handleBlur}
                        />
                    </View>
                </View>

                {/* Password Input */}
                <View>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className={`text-sm font-body font-medium ${focusedInput === 'password' ? 'text-divvit-secondary' : 'text-divvit-muted'}`}>
                            Password
                        </Text>
                    </View>
                    <View className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${focusedInput === 'password' ? 'border-divvit-secondary' : 'border-divvit-input-border'}`}>
                        <TextInput
                            className="text-divvit-text font-body text-base h-full"
                            placeholder="Your Password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            onFocus={() => handleFocus('password')}
                            onBlur={handleBlur}
                        />
                    </View>

                    <View className="flex-row justify-between mt-3">
                        <TouchableOpacity className="flex-row items-center gap-2">
                            <View className="w-4 h-4 border border-divvit-muted rounded bg-transparent" />
                            <Text className="text-divvit-muted text-xs">Remember me</Text>
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Text className="text-divvit-muted text-xs">Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="bg-divvit-secondary h-14 rounded-2xl items-center justify-center mb-8 shadow-lg"
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
                    <Text className="text-white font-bold text-lg">Logging in...</Text>
                ) : (
                    <Text className="text-white font-bold text-lg">Login</Text>
                )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-8">
                <View className="flex-1 h-[1px] bg-divvit-input-border" />
                <Text className="mx-4 text-divvit-muted text-xs">or sign up with</Text>
                <View className="flex-1 h-[1px] bg-divvit-input-border" />
            </View>

            {/* Social Login */}
            <View className="flex-row gap-4 mb-8">
                <TouchableOpacity
                    className="flex-1 h-12 bg-white rounded-xl items-center justify-center border border-divvit-input-border"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                    onPress={handleGoogleLogin}
                >
                    {/* Google Icon Placeholder */}
                    <Text className="font-bold text-divvit-text">G</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 h-12 bg-black rounded-xl items-center justify-center"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    {/* Apple Icon Placeholder */}
                    <Text className="font-bold text-white"></Text>
                </TouchableOpacity>
            </View>

            {/* Footer Navigation */}
            <View className="flex-row justify-center gap-1">
                <Text className="text-divvit-muted">Don't have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                    <Text className="text-divvit-secondary font-bold">Sign Up</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

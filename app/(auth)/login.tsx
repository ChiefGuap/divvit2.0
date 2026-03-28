import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert,
    Animated, Platform, Linking, ActivityIndicator,
    Dimensions, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { getAuthCallbackUrl } from '../../utils/url';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Google SVG ---
const GoogleIcon = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M23.49 12.275c0-.846-.076-1.66-.217-2.44H12v4.613h6.443c-.278 1.498-1.122 2.768-2.392 3.618v3.01h3.875c2.266-2.086 3.564-5.158 3.564-8.799z" fill="#EA4335" />
        <Path d="M12 24c3.24 0 5.957-1.075 7.942-2.914l-3.875-3.01c-1.074.72-2.448 1.144-4.067 1.144-3.127 0-5.772-2.112-6.717-4.956H1.423v3.116C3.404 21.89 7.427 24 12 24z" fill="#FBBC05" />
        <Path d="M5.283 14.264c-.24-.72-.377-1.49-.377-2.264s.137-1.544.377-2.264V6.62H1.423C.516 8.412 0 10.15 0 12s.516 3.588 1.423 5.38l3.86-3.116z" fill="#34A853" />
        <Path d="M12 4.773c1.764 0 3.348.606 4.593 1.794l3.444-3.444C17.952 1.191 15.235 0 12 0 7.427 0 3.404 2.11 1.423 5.38l3.86 3.116c.945-2.844 3.59-4.956 6.717-4.956z" fill="#4285F4" />
    </Svg>
);

// --- Apple SVG ---
const AppleIcon = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M17.05 20.28c-.96 0-1.76-.36-2.4-.36-.6 0-1.4.36-2.2.36-2.73 0-5.27-1.67-6.32-3.49-2.14-3.7-.55-9.15 1.51-12.12 1.03-1.48 2.22-2.31 3.52-2.34 1.29-.03 2.11.41 2.87.41s1.77-.45 3.01-.45c1.11.02 2.13.41 2.86 1.05-2.7 1.6-2.27 5.23.44 6.34-.84 1.24-1.92 2.47-3.29 4.41-.6.86-1.18 1.77-1.76 2.64-.4.59-.79 1.17-1.15 1.55-.38.41-.71.54-1.09.54zM12.03 5.07c0-1.1.41-2.15 1.11-2.95.73-.83 1.76-1.38 2.84-1.43.08 1.1-.33 2.17-1.05 2.97-.73.81-1.78 1.41-2.9 1.41z" fill="#ffffff" />
    </Svg>
);

export default function Login() {
    const router = useRouter();

    // --- Form state ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    // --- Animations ---
    const iconAnim      = useRef(new Animated.Value(0)).current;
    const iconTranslate = useRef(new Animated.Value(-16)).current;
    const headerAnim    = useRef(new Animated.Value(0)).current;
    const cardAnim      = useRef(new Animated.Value(0)).current;
    const cardSlide     = useRef(new Animated.Value(20)).current;
    const socialAnim    = useRef(new Animated.Value(0)).current;

    const anim = (val: Animated.Value, toValue: number, duration: number, delay: number) =>
        Animated.timing(val, { toValue, duration, delay, useNativeDriver: true });

    useEffect(() => {
        Animated.parallel([
            anim(iconAnim,      1, 400,  0),
            anim(iconTranslate, 0, 400,  0),
            anim(headerAnim,    1, 500,  200),
            anim(cardAnim,      1, 550,  450),
            anim(cardSlide,     0, 550,  450),
            anim(socialAnim,    1, 400,  800),
        ]).start();
    }, []);

    // --- Auth handlers (logic unchanged from original) ---
    const handleLogin = async () => {
        if (isLoading) return;
        setError(null);
        setIsLoading(true);
        try {
            await Haptics.selectionAsync();
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) {
                console.error('Login Error:', authError);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setError(authError.message);
            } else {
                console.log('Login Success');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                // Router redirection is handled by AuthContext
            }
        } catch (e: any) {
            console.error('Login Exception:', e);
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (isLoading) return;
        setIsLoading(true);
        console.log('Google Login Pressed');
        try {
            await Haptics.selectionAsync();
            const redirectUrl = getAuthCallbackUrl();
            console.log('OAuth redirectTo:', redirectUrl);
            const { data, error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });
            if (authError) {
                console.error('Google Auth Error:', authError);
                Alert.alert('Google Auth Failed', authError.message);
            } else if (data?.url) {
                console.log('Opening Supabase URL:', data.url);
                await Linking.openURL(data.url);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
            Alert.alert(
                'Not Available in Expo Go',
                'Apple Sign In requires a development build. Please use Google or Email to sign in while testing.'
            );
            return;
        }
        if (isLoading) return;
        setIsLoading(true);
        try {
            await Haptics.selectionAsync();
            const rawNonce = Crypto.randomUUID();
            const hashedNonce = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                rawNonce
            );
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });
            if (credential.identityToken) {
                const { error: authError } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                    nonce: rawNonce,
                });
                if (authError) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert('Apple Sign In Failed', authError.message);
                } else {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } else {
                throw new Error('No identity token received');
            }
        } catch (e: any) {
            if (e.code !== 'ERR_REQUEST_CANCELED') {
                Alert.alert('Error', e.message || 'An unexpected error occurred');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            {/* Ambient glow orbs */}
            <View style={{
                position: 'absolute', top: -SCREEN_WIDTH * 0.1, left: -SCREEN_WIDTH * 0.1,
                width: SCREEN_WIDTH * 0.4, height: SCREEN_WIDTH * 0.4,
                borderRadius: 9999, backgroundColor: 'rgba(75,41,180,0.05)',
            }} />
            <View style={{
                position: 'absolute', bottom: -SCREEN_WIDTH * 0.05, right: -SCREEN_WIDTH * 0.05,
                width: SCREEN_WIDTH * 0.3, height: SCREEN_WIDTH * 0.3,
                borderRadius: 9999, backgroundColor: 'rgba(206,193,255,0.2)',
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header — D icon */}
                    <Animated.View style={{
                        opacity: iconAnim,
                        transform: [{ translateY: iconTranslate }],
                        alignItems: 'center', marginBottom: 20,
                    }}>
                        <View style={{
                            width: 64, height: 64, borderRadius: 20,
                            backgroundColor: '#6346cd',
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: 'rgba(75,41,180,1)',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.2, shadowRadius: 16,
                            elevation: 8,
                        }}>
                            <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '800' }}>D</Text>
                        </View>
                    </Animated.View>

                    {/* Header — headline + subtitle */}
                    <Animated.View style={{
                        opacity: headerAnim,
                        alignItems: 'center', marginBottom: 28, paddingHorizontal: 24,
                    }}>
                        <Text style={{
                            fontSize: 32, fontWeight: '800', color: '#141b2b',
                            textAlign: 'center', letterSpacing: -0.5, marginBottom: 8,
                        }}>
                            Welcome back
                        </Text>
                        <Text style={{
                            fontSize: 16, color: '#484554', fontWeight: '500', textAlign: 'center',
                        }}>
                            Log in to manage your shared expenses
                        </Text>
                    </Animated.View>

                    {/* Main card */}
                    <Animated.View style={{
                        opacity: cardAnim,
                        transform: [{ translateY: cardSlide }],
                        marginHorizontal: 20,
                        backgroundColor: '#ffffff',
                        borderRadius: 32,
                        padding: 28,
                        shadowColor: '#141b2b',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.06, shadowRadius: 32,
                        elevation: 6,
                    }}>
                        {/* A — Email field */}
                        <View style={{ marginBottom: 0 }}>
                            <Text style={{
                                fontSize: 11, fontWeight: '700', color: '#484554',
                                textTransform: 'uppercase', letterSpacing: 2,
                                marginBottom: 8, marginLeft: 4,
                            }}>
                                Email
                            </Text>
                            <View style={{
                                backgroundColor: '#f1f3ff', borderRadius: 16, height: 56,
                                flexDirection: 'row', alignItems: 'center',
                                paddingHorizontal: 16,
                                borderWidth: emailFocused ? 1.5 : 0,
                                borderColor: emailFocused ? '#4b29b4' : 'transparent',
                            }}>
                                <Mail size={20} color="#797585" strokeWidth={2} />
                                <TextInput
                                    style={{
                                        flex: 1, marginLeft: 12,
                                        fontSize: 15, color: '#141b2b',
                                    }}
                                    placeholder="name@example.com"
                                    placeholderTextColor="#797585"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={(t) => { setEmail(t); setError(null); }}
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => setEmailFocused(false)}
                                />
                            </View>
                        </View>

                        {/* B — Password field */}
                        <View style={{ marginTop: 20 }}>
                            <View style={{
                                flexDirection: 'row', justifyContent: 'space-between',
                                alignItems: 'center', marginBottom: 8,
                            }}>
                                <Text style={{
                                    fontSize: 11, fontWeight: '700', color: '#484554',
                                    textTransform: 'uppercase', letterSpacing: 2, marginLeft: 4,
                                }}>
                                    Password
                                </Text>
                                <TouchableOpacity activeOpacity={0.7}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4b29b4' }}>
                                        Forgot password?
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{
                                backgroundColor: '#f1f3ff', borderRadius: 16, height: 56,
                                flexDirection: 'row', alignItems: 'center',
                                paddingHorizontal: 16,
                                borderWidth: passwordFocused ? 1.5 : 0,
                                borderColor: passwordFocused ? '#4b29b4' : 'transparent',
                            }}>
                                <Lock size={20} color="#797585" strokeWidth={2} />
                                <TextInput
                                    style={{
                                        flex: 1, marginLeft: 12,
                                        fontSize: 15, color: '#141b2b',
                                    }}
                                    placeholder="••••••••"
                                    placeholderTextColor="#797585"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setError(null); }}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(v => !v)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    {showPassword
                                        ? <EyeOff size={20} color="#797585" strokeWidth={2} />
                                        : <Eye size={20} color="#797585" strokeWidth={2} />
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Error message */}
                        {error && (
                            <Text style={{
                                fontSize: 13, color: '#ba1a1a', textAlign: 'center',
                                marginTop: 12, marginBottom: -4,
                            }}>
                                {error}
                            </Text>
                        )}

                        {/* C — Log In button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            activeOpacity={0.85}
                            disabled={isLoading}
                            style={{
                                marginTop: 28,
                                shadowColor: '#4b29b4',
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.25, shadowRadius: 16,
                                elevation: 8,
                            }}
                        >
                            <LinearGradient
                                colors={['#6346cd', '#4b29b4']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{
                                    height: 56, borderRadius: 999,
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {isLoading
                                    ? <ActivityIndicator color="#ffffff" size="small" />
                                    : <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>Log In</Text>
                                }
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* D — OR divider */}
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            marginVertical: 24,
                        }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#cac4d6', opacity: 0.35 }} />
                            <Text style={{
                                fontSize: 11, fontWeight: '700', color: '#797585',
                                letterSpacing: 2, textTransform: 'uppercase',
                                paddingHorizontal: 16,
                            }}>
                                OR
                            </Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#cac4d6', opacity: 0.35 }} />
                        </View>

                        {/* E — Social buttons */}
                        <Animated.View style={{ opacity: socialAnim }}>
                            {/* Google */}
                            <TouchableOpacity
                                onPress={handleGoogleLogin}
                                activeOpacity={0.85}
                                style={{
                                    height: 56, borderRadius: 999,
                                    backgroundColor: '#f1f3ff',
                                    flexDirection: 'row', alignItems: 'center',
                                    justifyContent: 'center', gap: 12,
                                    marginBottom: 12,
                                }}
                            >
                                <GoogleIcon />
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#141b2b' }}>
                                    Continue with Google
                                </Text>
                            </TouchableOpacity>

                            {/* Apple (iOS only) */}
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    onPress={handleAppleLogin}
                                    activeOpacity={0.85}
                                    style={{
                                        height: 56, borderRadius: 999,
                                        backgroundColor: '#141b2b',
                                        flexDirection: 'row', alignItems: 'center',
                                        justifyContent: 'center', gap: 12,
                                    }}
                                >
                                    <AppleIcon />
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                                        Continue with Apple
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    </Animated.View>

                    {/* Footer — sign up link */}
                    <Animated.View style={{
                        opacity: socialAnim,
                        marginTop: 24, alignItems: 'center',
                    }}>
                        <Text style={{ fontSize: 15, color: '#484554' }}>
                            Don't have an account?{' '}
                            <Text
                                onPress={() => router.push('/(auth)/signup')}
                                style={{ color: '#4b29b4', fontWeight: '700' }}
                            >
                                Sign Up
                            </Text>
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

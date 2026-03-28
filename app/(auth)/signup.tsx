import React, { useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Animated, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { getAuthCallbackUrl } from '../../utils/url';

// --- SVG Icons ---
const GoogleIcon = () => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M23.49 12.275c0-.846-.076-1.66-.217-2.44H12v4.613h6.443c-.278 1.498-1.122 2.768-2.392 3.618v3.01h3.875c2.266-2.086 3.564-5.158 3.564-8.799z" fill="#EA4335" />
        <Path d="M12 24c3.24 0 5.957-1.075 7.942-2.914l-3.875-3.01c-1.074.72-2.448 1.144-4.067 1.144-3.127 0-5.772-2.112-6.717-4.956H1.423v3.116C3.404 21.89 7.427 24 12 24z" fill="#FBBC05" />
        <Path d="M5.283 14.264c-.24-.72-.377-1.49-.377-2.264s.137-1.544.377-2.264V6.62H1.423C.516 8.412 0 10.15 0 12s.516 3.588 1.423 5.38l3.86-3.116z" fill="#34A853" />
        <Path d="M12 4.773c1.764 0 3.348.606 4.593 1.794l3.444-3.444C17.952 1.191 15.235 0 12 0 7.427 0 3.404 2.11 1.423 5.38l3.86 3.116c.945-2.844 3.59-4.956 6.717-4.956z" fill="#4285F4" />
    </Svg>
);

const AppleIcon = () => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M17.05 20.28c-.96 0-1.76-.36-2.4-.36-.6 0-1.4.36-2.2.36-2.73 0-5.27-1.67-6.32-3.49-2.14-3.7-.55-9.15 1.51-12.12 1.03-1.48 2.22-2.31 3.52-2.34 1.29-.03 2.11.41 2.87.41s1.77-.45 3.01-.45c1.11.02 2.13.41 2.86 1.05-2.7 1.6-2.27 5.23.44 6.34-.84 1.24-1.92 2.47-3.29 4.41-.6.86-1.18 1.77-1.76 2.64-.4.59-.79 1.17-1.15 1.55-.38.41-.71.54-1.09.54zM12.03 5.07c0-1.1.41-2.15 1.11-2.95.73-.83 1.76-1.38 2.84-1.43.08 1.1-.33 2.17-1.05 2.97-.73.81-1.78 1.41-2.9 1.41z" fill="#141b2b" />
    </Svg>
);

const socialShadow = {
    shadowColor: '#141b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
};

export default function SignupScreen() {
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);

    const logoAnim    = useRef(new Animated.Value(0)).current;
    const cardAnim    = useRef(new Animated.Value(0)).current;
    const cardSlide   = useRef(new Animated.Value(24)).current;
    const emailAnim   = useRef(new Animated.Value(0)).current;
    const dividerAnim = useRef(new Animated.Value(0)).current;
    const googleAnim  = useRef(new Animated.Value(0)).current;
    const appleAnim   = useRef(new Animated.Value(0)).current;
    const bottomAnim  = useRef(new Animated.Value(0)).current;

    const anim = (val: Animated.Value, toValue: number, duration: number, delay: number) =>
        Animated.timing(val, { toValue, duration, delay, useNativeDriver: true });

    useEffect(() => {
        Animated.parallel([
            anim(logoAnim,    1, 400,  0),
            anim(cardAnim,    1, 500,  200),
            anim(cardSlide,   0, 500,  200),
            anim(emailAnim,   1, 400,  500),
            anim(dividerAnim, 1, 400,  700),
            anim(googleAnim,  1, 300,  800),
            anim(appleAnim,   1, 300,  950),
            anim(bottomAnim,  1, 400,  1100),
        ]).start();
    }, []);

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await Haptics.selectionAsync();
            const redirectUrl = getAuthCallbackUrl();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
            });
            if (error) {
                Alert.alert('Google Auth Failed', error.message);
            } else if (data?.url) {
                await Linking.openURL(data.url);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
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
        if (loading) return;
        setLoading(true);
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
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                    nonce: rawNonce,
                });
                if (error) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert('Apple Sign In Failed', error.message);
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
            setLoading(false);
        }
    };

    const handleEmailSignup = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/email-signup');
    };

    const handleLogin = async () => {
        await Haptics.selectionAsync();
        router.push('/(auth)/login');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View style={{
                    opacity: logoAnim,
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8,
                }}>
                    <View style={{ width: 28, height: 20, position: 'relative', marginRight: 8 }}>
                        <View style={{
                            position: 'absolute', left: 0, bottom: 0,
                            width: 14, height: 14, borderRadius: 7,
                            backgroundColor: '#4b29b4',
                        }} />
                        <View style={{
                            position: 'absolute', right: 0, top: 0,
                            width: 11, height: 11, borderRadius: 5.5,
                            backgroundColor: '#4b29b4',
                        }} />
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 24, color: '#4b29b4', letterSpacing: -0.5 }}>
                        Divvit
                    </Text>
                </Animated.View>

                {/* Main card */}
                <Animated.View style={{
                    opacity: cardAnim,
                    transform: [{ translateY: cardSlide }],
                    marginHorizontal: 20,
                    marginTop: 24,
                    backgroundColor: '#f1f3ff',
                    borderRadius: 40,
                    padding: 32,
                }}>
                    {/* A — Headline */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <Text style={{
                            fontSize: 32, fontWeight: '800', color: '#141b2b',
                            textAlign: 'center', marginBottom: 8,
                        }}>
                            Get started
                        </Text>
                        <Text style={{
                            fontSize: 16, color: '#484554', fontWeight: '500', textAlign: 'center',
                        }}>
                            Choose how you want to join Divvit
                        </Text>
                    </View>

                    {/* B — Sign Up with Email */}
                    <Animated.View style={{ opacity: emailAnim }}>
                        <TouchableOpacity
                            onPress={handleEmailSignup}
                            activeOpacity={0.85}
                            style={{
                                shadowColor: '#4b29b4',
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.3, shadowRadius: 16,
                                elevation: 8,
                            }}
                        >
                            <LinearGradient
                                colors={['#6346cd', '#4b29b4']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{
                                    height: 60, borderRadius: 999,
                                    flexDirection: 'row', alignItems: 'center',
                                    justifyContent: 'center', gap: 10,
                                }}
                            >
                                <Mail size={20} color="#ffffff" strokeWidth={2.5} />
                                <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>
                                    Sign Up with Email
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* C — OR divider */}
                    <Animated.View style={{
                        opacity: dividerAnim,
                        flexDirection: 'row', alignItems: 'center',
                        marginVertical: 20,
                    }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#cac4d6', opacity: 0.4 }} />
                        <Text style={{
                            marginHorizontal: 14, fontSize: 12, fontWeight: '700',
                            color: '#797585', letterSpacing: 2, textTransform: 'uppercase',
                        }}>
                            OR
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#cac4d6', opacity: 0.4 }} />
                    </Animated.View>

                    {/* D — Google */}
                    <Animated.View style={{ opacity: googleAnim, marginBottom: 12 }}>
                        <TouchableOpacity
                            onPress={handleGoogleLogin}
                            activeOpacity={0.85}
                            style={[{
                                height: 60, borderRadius: 999,
                                backgroundColor: '#ffffff',
                                flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'center', gap: 12,
                            }, socialShadow]}
                        >
                            <GoogleIcon />
                            <Text style={{ fontSize: 17, fontWeight: '700', color: '#141b2b' }}>
                                Continue with Google
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* D — Apple (iOS only) */}
                    {Platform.OS === 'ios' && (
                        <Animated.View style={{ opacity: appleAnim }}>
                            <TouchableOpacity
                                onPress={handleAppleLogin}
                                activeOpacity={0.85}
                                style={[{
                                    height: 60, borderRadius: 999,
                                    backgroundColor: '#ffffff',
                                    flexDirection: 'row', alignItems: 'center',
                                    justifyContent: 'center', gap: 12,
                                }, socialShadow]}
                            >
                                <AppleIcon />
                                <Text style={{ fontSize: 17, fontWeight: '700', color: '#141b2b' }}>
                                    Continue with Apple
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* E — Already have an account */}
                    <Animated.View style={{ opacity: bottomAnim, marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, color: '#484554' }}>
                            Already have an account?{' '}
                            <Text
                                onPress={handleLogin}
                                style={{ color: '#4b29b4', fontWeight: '700' }}
                            >
                                Log In
                            </Text>
                        </Text>
                    </Animated.View>

                    {/* F — Legal */}
                    <Animated.View style={{ opacity: bottomAnim, marginTop: 28 }}>
                        <View style={{
                            height: 1, backgroundColor: '#cac4d6',
                            opacity: 0.15, marginBottom: 20,
                        }} />
                        <Text style={{
                            fontSize: 10, textAlign: 'center', color: '#797585',
                            textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 16,
                        }}>
                            BY CONTINUING, YOU AGREE TO DIVVIT'S{'\n'}
                            <Text style={{ fontWeight: '800' }}>TERMS OF SERVICE</Text>
                            {' AND '}
                            <Text style={{ fontWeight: '800' }}>PRIVACY POLICY</Text>
                        </Text>
                    </Animated.View>
                </Animated.View>

                {/* Footer */}
                <Animated.View style={{
                    opacity: bottomAnim,
                    alignItems: 'center', paddingTop: 32, paddingBottom: 32,
                }}>
                    <View style={{ flexDirection: 'row', gap: 24, marginBottom: 8 }}>
                        <Text style={{
                            fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
                            textTransform: 'uppercase', color: 'rgba(20,27,43,0.35)',
                        }}>
                            Instagram
                        </Text>
                        <Text style={{
                            fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
                            textTransform: 'uppercase', color: 'rgba(20,27,43,0.35)',
                        }}>
                            Twitter
                        </Text>
                    </View>
                    <Text style={{
                        fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
                        textTransform: 'uppercase', color: 'rgba(20,27,43,0.35)',
                    }}>
                        © 2024 Divvit Technologies
                    </Text>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

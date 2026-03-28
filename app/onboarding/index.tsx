import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();

    const logoOpacity = useSharedValue(0);
    const logoTranslate = useSharedValue(30);
    const wordmarkOpacity = useSharedValue(0);
    const wordmarkTranslate = useSharedValue(30);
    const dividerOpacity = useSharedValue(0);
    const taglineOpacity = useSharedValue(0);
    const buttonsOpacity = useSharedValue(0);
    const buttonsTranslate = useSharedValue(40);
    const bottomTagOpacity = useSharedValue(0);

    useEffect(() => {
        const cfg = { duration: 600, easing: Easing.out(Easing.exp) };
        logoOpacity.value = withDelay(100, withTiming(1, cfg));
        logoTranslate.value = withDelay(100, withTiming(0, cfg));
        wordmarkOpacity.value = withDelay(250, withTiming(1, cfg));
        wordmarkTranslate.value = withDelay(250, withTiming(0, cfg));
        dividerOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
        taglineOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
        buttonsOpacity.value = withDelay(650, withTiming(1, { duration: 500 }));
        buttonsTranslate.value = withDelay(650, withTiming(0, cfg));
        bottomTagOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ translateY: logoTranslate.value }],
    }));
    const wordmarkStyle = useAnimatedStyle(() => ({
        opacity: wordmarkOpacity.value,
        transform: [{ translateY: wordmarkTranslate.value }],
    }));
    const dividerStyle = useAnimatedStyle(() => ({ opacity: dividerOpacity.value }));
    const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
    const buttonsStyle = useAnimatedStyle(() => ({
        opacity: buttonsOpacity.value,
        transform: [{ translateY: buttonsTranslate.value }],
    }));
    const bottomTagStyle = useAnimatedStyle(() => ({ opacity: bottomTagOpacity.value }));

    const handleGetStarted = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/onboarding/group-lobbies');
    };

    const handleSignIn = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/login');
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#5B35D5', '#4b29b4', '#3D1FA8']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={{ flex: 1 }}
            >
                {/* Ambient glow orbs */}
                <View style={{
                    position: 'absolute', top: -80, left: -80,
                    width: 300, height: 300, borderRadius: 150,
                    backgroundColor: 'rgba(147,112,255,0.25)',
                }} />
                <View style={{
                    position: 'absolute', top: SCREEN_HEIGHT * 0.35, right: -100,
                    width: 280, height: 280, borderRadius: 140,
                    backgroundColor: 'rgba(91,53,213,0.3)',
                }} />
                <View style={{
                    position: 'absolute', bottom: 100, left: -60,
                    width: 200, height: 200, borderRadius: 100,
                    backgroundColor: 'rgba(120,80,240,0.2)',
                }} />

                {/* Main content */}
                <View style={{
                    flex: 1, alignItems: 'center',
                    justifyContent: 'center', paddingHorizontal: 32,
                }}>
                    {/* App icon */}
                    <Animated.View style={[logoStyle, { marginBottom: 28 }]}>
                        <View style={{
                            width: 96, height: 96, borderRadius: 28,
                            backgroundColor: 'rgba(255,255,255,0.12)',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                        }}>
                            <Text style={{
                                fontSize: 48, fontWeight: '800',
                                color: '#ffffff', letterSpacing: -2,
                            }}>D</Text>
                        </View>
                    </Animated.View>

                    {/* Wordmark */}
                    <Animated.Text style={[wordmarkStyle, {
                        fontSize: 64, fontWeight: '800',
                        color: '#ffffff', letterSpacing: -2, marginBottom: 20,
                    }]}>
                        Divvit
                    </Animated.Text>

                    {/* Divider */}
                    <Animated.View style={[dividerStyle, {
                        width: 64, height: 3,
                        backgroundColor: 'rgba(255,255,255,0.35)',
                        borderRadius: 999, marginBottom: 20,
                    }]} />

                    {/* Tagline */}
                    <Animated.Text style={[taglineStyle, {
                        fontSize: 20, fontWeight: '500',
                        color: 'rgba(255,255,255,0.85)',
                        marginBottom: 56, textAlign: 'center',
                    }]}>
                        Splitting made simple.
                    </Animated.Text>

                    {/* Buttons */}
                    <Animated.View style={[buttonsStyle, { width: '100%', gap: 14 }]}>
                        <TouchableOpacity
                            onPress={handleGetStarted}
                            activeOpacity={0.85}
                            style={{
                                backgroundColor: '#ffffff',
                                height: 60, borderRadius: 999,
                                flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'center', gap: 10,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15, shadowRadius: 12,
                                elevation: 6,
                            }}
                        >
                            <Text style={{
                                fontSize: 17, fontWeight: '800',
                                color: '#4b29b4', letterSpacing: -0.3,
                            }}>Get Started</Text>
                            <ArrowRight size={20} color="#4b29b4" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSignIn}
                            activeOpacity={0.75}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.12)',
                                height: 60, borderRadius: 999,
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                            }}
                        >
                            <Text style={{
                                fontSize: 17, fontWeight: '700', color: '#ffffff',
                            }}>Sign In</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Bottom tagline */}
                <Animated.View style={[bottomTagStyle, {
                    alignItems: 'center', paddingBottom: 40,
                }]}>
                    <Text style={{
                        fontSize: 10, fontWeight: '800',
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: 3, textTransform: 'uppercase',
                    }}>
                        Your Social Economy, Elevated
                    </Text>
                </Animated.View>
            </LinearGradient>
        </View>
    );
}

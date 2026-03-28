import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 310);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.96);

export default function SocialFinanceScreen() {
    const router = useRouter();

    const headerOpacity   = useSharedValue(0);
    const cardOpacity     = useSharedValue(0);
    const cardTranslate   = useSharedValue(16);
    const glassOpacity    = useSharedValue(0);
    const glassTranslate  = useSharedValue(12);
    const headlineOpacity = useSharedValue(0);
    const subtitleOpacity = useSharedValue(0);
    const buttonOpacity   = useSharedValue(0);
    const buttonTranslate = useSharedValue(12);

    useEffect(() => {
        const ease = (dur: number) => ({ duration: dur, easing: Easing.out(Easing.exp) });

        headerOpacity.value   = withDelay(200,  withTiming(1, ease(600)));
        cardOpacity.value     = withDelay(600,  withTiming(1, ease(700)));
        cardTranslate.value   = withDelay(600,  withTiming(0, ease(700)));
        glassOpacity.value    = withDelay(1000, withTiming(1, ease(600)));
        glassTranslate.value  = withDelay(1000, withTiming(0, ease(600)));
        headlineOpacity.value = withDelay(1200, withTiming(1, ease(700)));
        subtitleOpacity.value = withDelay(1500, withTiming(1, ease(600)));
        buttonOpacity.value   = withDelay(1800, withTiming(1, ease(500)));
        buttonTranslate.value = withDelay(1800, withTiming(0, ease(500)));
    }, []);

    const headerStyle   = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
    const cardStyle     = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslate.value }],
    }));
    const glassStyle    = useAnimatedStyle(() => ({
        opacity: glassOpacity.value,
        transform: [{ translateX: glassTranslate.value }],
    }));
    const headlineStyle = useAnimatedStyle(() => ({ opacity: headlineOpacity.value }));
    const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
    const buttonStyle   = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: buttonTranslate.value }],
    }));

    const handleGetStarted = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/(auth)/signup');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            {/* Ambient glow orbs */}
            <View style={{
                position: 'absolute', top: -60, right: -60,
                width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.55,
                borderRadius: 9999, backgroundColor: 'rgba(75,41,180,0.05)',
            }} />
            <View style={{
                position: 'absolute', bottom: -80, left: -60,
                width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.65,
                borderRadius: 9999, backgroundColor: 'rgba(206,193,255,0.1)',
            }} />

            {/* Header */}
            <Animated.View style={[headerStyle, {
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
            }]}>
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
                <Text style={{ fontWeight: '800', fontSize: 22, color: '#4b29b4', letterSpacing: -0.5 }}>
                    Divvit
                </Text>
            </Animated.View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 }}
            >
                {/* Illustration card — extra bottom margin accounts for floating glass card */}
                <Animated.View style={[cardStyle, {
                    width: CARD_WIDTH,
                    marginBottom: 112,
                    marginTop: 8,
                }]}>
                    <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>

                        {/* Layer 1 — rotate 6deg, scale 0.95, primary-container/10 */}
                        <View style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(99,70,205,0.10)', borderRadius: 48,
                            transform: [{ rotate: '6deg' }, { scale: 0.95 }],
                        }} />
                        {/* Layer 2 — rotate -3deg, secondary-container/20 */}
                        <View style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(206,193,255,0.20)', borderRadius: 48,
                            transform: [{ rotate: '-3deg' }],
                        }} />
                        {/* Layer 3a — shadow base */}
                        <View style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            borderRadius: 48, backgroundColor: '#1a1a2e',
                            shadowColor: '#141b2b',
                            shadowOffset: { width: 0, height: 16 },
                            shadowOpacity: 0.20, shadowRadius: 40,
                            elevation: 12,
                        }} />
                        {/* Layer 3b — clipped photo */}
                        <View style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            borderRadius: 48, overflow: 'hidden',
                        }}>
                            <Image
                                source={{ uri: 'https://i.etsystatic.com/28921914/r/il/0c2858/3447345332/il_fullxfull.3447345332_ovvk.jpg' }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        </View>

                        {/* Floating glass card — hangs below-right of main card */}
                        <Animated.View style={[glassStyle, {
                            position: 'absolute',
                            bottom: -88,
                            right: -20,
                            backgroundColor: 'rgba(255,255,255,0.78)',
                            borderRadius: 20,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.25)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14,
                            shadowColor: '#141b2b',
                            shadowOffset: { width: 0, height: 12 },
                            shadowOpacity: 0.10, shadowRadius: 32,
                            elevation: 10,
                            minWidth: 220,
                        }]}>
                            <View style={{
                                width: 48, height: 48, borderRadius: 24,
                                backgroundColor: '#4b29b4',
                                alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Sparkles size={22} color="#ffffff" strokeWidth={2} />
                            </View>
                            <View>
                                <Text style={{
                                    fontSize: 10, fontWeight: '700', color: '#4b29b4',
                                    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4,
                                }}>
                                    Experience
                                </Text>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#141b2b' }}>
                                    Financial Harmony
                                </Text>
                            </View>
                        </Animated.View>
                    </View>
                </Animated.View>

                {/* Headline */}
                <Animated.View style={[headlineStyle, { marginBottom: 14 }]}>
                    <Text style={{
                        fontSize: 36, fontWeight: '800', textAlign: 'center',
                        lineHeight: 44, letterSpacing: -0.5,
                    }}>
                        <Text style={{ color: '#141b2b' }}>Join the future of </Text>
                        <Text style={{ color: '#4b29b4' }}>Social Finance.</Text>
                    </Text>
                </Animated.View>

                {/* Subtitle */}
                <Animated.View style={[subtitleStyle, { paddingHorizontal: 8 }]}>
                    <Text style={{
                        fontSize: 17, color: '#484554',
                        lineHeight: 26, textAlign: 'center',
                    }}>
                        Elevate your shared experiences. Divvit helps you split bills, track group rewards, and manage your financial life with effortless elegance.
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* Footer */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
                <Animated.View style={buttonStyle}>
                    <TouchableOpacity
                        onPress={handleGetStarted}
                        activeOpacity={0.85}
                        style={{
                            shadowColor: '#4b29b4',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.25, shadowRadius: 24,
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
                                justifyContent: 'center', gap: 8,
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>Get Started</Text>
                            <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>
                    <Text style={{
                        marginTop: 12, fontSize: 11, fontWeight: '700',
                        color: 'rgba(20,27,43,0.35)', letterSpacing: 2,
                        textTransform: 'uppercase', textAlign: 'center',
                    }}>
                        © 2024 Divvit Technologies
                    </Text>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

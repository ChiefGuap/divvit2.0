import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.15;

export default function GroupLobbiesScreen() {
    const router = useRouter();

    const handleNext = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/onboarding/personal-info');
    };

    const handleSkip = async () => {
        await Haptics.selectionAsync();
        router.replace('/(tabs)');
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
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16,
            }}>
                {/* Divvit logo — bubble dots + wordmark */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 28, height: 20, position: 'relative' }}>
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
                </View>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ color: '#484554', fontWeight: '600', fontSize: 15 }}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* Main scrollable content */}
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 }}>

                {/* Illustration Card */}
                <Animated.View
                    entering={FadeInDown.delay(60).springify()}
                    style={{
                        width: CARD_WIDTH, height: CARD_HEIGHT,
                        alignSelf: 'center', marginBottom: 36,
                    }}
                >
                    {/* Layer 1 — rotated +3deg, surface-container-low */}
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: '#e8ecf8', borderRadius: 40,
                        transform: [{ rotate: '3deg' }],
                    }} />
                    {/* Layer 2 — rotated -3deg, primary tint */}
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(75,41,180,0.06)', borderRadius: 40,
                        transform: [{ rotate: '-3deg' }],
                    }} />
                    {/* Layer 3a — shadow base (no overflow:hidden so shadow renders) */}
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 40, backgroundColor: '#ffffff',
                        shadowColor: '#141b2b',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.1, shadowRadius: 28,
                        elevation: 8,
                    }} />
                    {/* Layer 3b — clipped content */}
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 40, overflow: 'hidden',
                    }}>
                        {/* Photo illustration — teal gradient with person shapes */}
                        <LinearGradient
                            colors={['#5a9e94', '#3d7a70', '#2a5e55']}
                            start={{ x: 0.1, y: 0 }}
                            end={{ x: 0.9, y: 1 }}
                            style={{ flex: 1 }}
                        >
                            {/* Person silhouettes — three figures */}
                            {/* Left person */}
                            <View style={{
                                position: 'absolute', top: 40, left: 20,
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 72, height: 72, borderRadius: 36,
                                    backgroundColor: 'rgba(60,100,80,0.7)',
                                }} />
                                <View style={{
                                    width: 100, height: 130,
                                    borderTopLeftRadius: 50, borderTopRightRadius: 50,
                                    backgroundColor: 'rgba(55,90,70,0.6)',
                                    marginTop: 4,
                                }} />
                            </View>
                            {/* Center person (slightly forward/larger) */}
                            <View style={{
                                position: 'absolute', top: 20,
                                alignSelf: 'center',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 80, height: 80, borderRadius: 40,
                                    backgroundColor: 'rgba(160,100,70,0.65)',
                                }} />
                                <View style={{
                                    width: 110, height: 150,
                                    borderTopLeftRadius: 55, borderTopRightRadius: 55,
                                    backgroundColor: 'rgba(140,80,55,0.55)',
                                    marginTop: 4,
                                }} />
                            </View>
                            {/* Right person */}
                            <View style={{
                                position: 'absolute', top: 44, right: 22,
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 70, height: 70, borderRadius: 35,
                                    backgroundColor: 'rgba(80,110,130,0.65)',
                                }} />
                                <View style={{
                                    width: 96, height: 120,
                                    borderTopLeftRadius: 48, borderTopRightRadius: 48,
                                    backgroundColor: 'rgba(65,95,115,0.55)',
                                    marginTop: 4,
                                }} />
                            </View>
                            {/* Highlight shimmer */}
                            <View style={{
                                position: 'absolute', top: 0, left: 0, right: 0,
                                height: 80, backgroundColor: 'rgba(255,255,255,0.06)',
                            }} />
                        </LinearGradient>

                        {/* Glassmorphism bar */}
                        <View style={{
                            position: 'absolute', bottom: 14, left: 14, right: 14,
                            backgroundColor: 'rgba(255,255,255,0.78)',
                            borderRadius: 20, padding: 14,
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                        }}>
                            {/* Overlapping avatars */}
                            <View style={{ flexDirection: 'row' }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: '#4b29b4',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: '#ffffff', zIndex: 4,
                                }}>
                                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>JD</Text>
                                </View>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: '#cec1ff',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: '#ffffff',
                                    marginLeft: -10, zIndex: 3,
                                }}>
                                    <Text style={{ color: '#574d82', fontSize: 11, fontWeight: '800' }}>AK</Text>
                                </View>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: '#8B5E3C',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: '#ffffff',
                                    marginLeft: -10, zIndex: 2,
                                }}>
                                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>ML</Text>
                                </View>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: '#dce2f7',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: '#ffffff',
                                    marginLeft: -10, zIndex: 1,
                                }}>
                                    <Text style={{ color: '#484554', fontSize: 10, fontWeight: '800' }}>+5</Text>
                                </View>
                            </View>
                            {/* Placeholder text bars */}
                            <View style={{ flex: 1, gap: 6 }}>
                                <View style={{ height: 8, width: 72, borderRadius: 4, backgroundColor: 'rgba(75,41,180,0.2)' }} />
                                <View style={{ height: 8, width: 104, borderRadius: 4, backgroundColor: 'rgba(75,41,180,0.1)' }} />
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Text content */}
                <Animated.View
                    entering={FadeInDown.delay(160).springify()}
                    style={{ alignItems: 'center', paddingHorizontal: 16 }}
                >
                    <Text style={{
                        fontSize: 36, fontWeight: '800', textAlign: 'center',
                        lineHeight: 44, letterSpacing: -0.5, marginBottom: 14,
                    }}>
                        <Text style={{ color: '#141b2b' }}>Split with the </Text>
                        <Text style={{ color: '#4b29b4' }}>Whole Squad</Text>
                    </Text>
                    <Text style={{
                        fontSize: 17, color: '#484554',
                        lineHeight: 26, textAlign: 'center',
                    }}>
                        Create a lobby, share the link, and watch everyone join in real-time.
                    </Text>
                </Animated.View>
            </View>

            {/* Footer */}
            <Animated.View
                entering={FadeIn.delay(240)}
                style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 24, alignItems: 'center', gap: 20 }}
            >
                {/* Pagination dots */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#cac4d6' }} />
                    <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: '#4b29b4' }} />
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#cac4d6' }} />
                </View>

                {/* Next button */}
                <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.85}
                    style={{
                        width: '100%',
                        height: 60, borderRadius: 999,
                        backgroundColor: '#4b29b4',
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'center', gap: 8,
                        shadowColor: '#4b29b4',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3, shadowRadius: 20,
                        elevation: 8,
                    }}
                >
                    <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>Next</Text>
                    <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

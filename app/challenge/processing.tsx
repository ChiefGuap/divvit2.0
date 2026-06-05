import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Import mock data to determine rewards points
import {
  mockDailyChallenge,
  mockDailyChallenges,
  mockStandardChallenges,
  mockGroupChallenge,
  mockGroupChallenges,
  mockReferralChallenge,
} from '../../data/mockChallenges';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STATUS_MESSAGES = [
  'ANALYZING RECEIPT',
  'VALIDATING ITEMS',
  'CHECKING ELIGIBILITY',
];

export default function ReceiptProcessingScreen() {
  const router = useRouter();
  const { challengeId, photoUri } = useLocalSearchParams();
  const idStr = Array.isArray(challengeId) ? challengeId[0] : (challengeId || '');
  const imageUriDecoded = photoUri ? decodeURIComponent(Array.isArray(photoUri) ? photoUri[0] : photoUri) : null;

  const [statusIndex, setStatusIndex] = useState(0);

  // Reanimated values for animations
  const spinVal = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const floatY1 = useSharedValue(0);
  const floatY2 = useSharedValue(0);
  const statusOpacity = useSharedValue(1);
  const progressX = useSharedValue(-80);
  const bgScanLineY = useSharedValue(0);

  // Setup loop animations
  useEffect(() => {
    // Spinning border segment loop
    spinVal.value = withRepeat(
      withTiming(360, { duration: 1600, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse expanding backdrop loop
    pulseScale.value = withRepeat(
      withTiming(1.7, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Accent dot 1 float
    floatY1.value = withRepeat(
      withTiming(-10, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Accent dot 2 float
    floatY2.value = withRepeat(
      withTiming(10, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Indeterminate progress bar sliding loop
    progressX.value = withRepeat(
      withTiming(240, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );

    // Faint background scan line loop
    bgScanLineY.value = withRepeat(
      withTiming(SCREEN_HEIGHT, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Cycling status labels every 2 seconds with fade transition
  useEffect(() => {
    const timer = setInterval(() => {
      statusOpacity.value = withTiming(0, { duration: 250 }, () => {
        setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
        statusOpacity.value = withTiming(1, { duration: 250 });
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Lookup challenge points for success route parameter
  const getChallengePoints = (id: string): number => {
    if (!id) return 25; // default fallback points
    if (mockDailyChallenge.id === id) return mockDailyChallenge.points;
    if (mockGroupChallenge.id === id) return mockGroupChallenge.points;
    if (mockReferralChallenge.id === id) return mockReferralChallenge.points;

    const daily = mockDailyChallenges.find((c) => c.id === id);
    if (daily) return daily.points;

    const std = mockStandardChallenges.find((c) => c.id === id);
    if (std) return std.points;

    const grp = mockGroupChallenges.find((c) => c.id === id);
    if (grp) return grp.points;

    return 25;
  };

  const pointsAwarded = getChallengePoints(idStr);

  // Simulated validation delay (3.5 seconds)
  useEffect(() => {
    const validationTimer = setTimeout(() => {
      // ON SUCCESS: router.replace to the Challenge Complete screen
      router.replace({
        pathname: '/challenge/complete',
        params: { challengeId: idStr, points: pointsAwarded },
      });
    }, 3500);

    return () => clearTimeout(validationTimer);
  }, [idStr, pointsAwarded]);

  // Animated styles
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinVal.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const floatStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY1.value }],
  }));

  const floatStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY2.value }],
  }));

  const statusStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progressX.value }],
  }));

  const bgScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bgScanLineY.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Blurred captured receipt image behind */}
      {imageUriDecoded && (
        <Image
          source={{ uri: imageUriDecoded }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          blurRadius={24}
        />
      )}

      {/* Faint scan line in background */}
      <Animated.View style={[styles.bgScanLine, bgScanLineStyle]} />

      {/* Center column container */}
      <View style={styles.content}>
        {/* Pulsing logo block */}
        <View style={styles.logoBlockContainer}>
          {/* Pulsing ring behind */}
          <Animated.View style={[styles.pulseRing, pulseStyle]} />

          {/* Floating accent dots */}
          <Animated.View style={[styles.accentDotSecondary, floatStyle1]} />
          <Animated.View style={[styles.accentDotTertiary, floatStyle2]} />

          {/* Spinning border-segment ring */}
          <Animated.View style={[styles.spinningSegment, spinStyle]} />

          {/* Centered 128px white circle tile */}
          <View style={styles.logoCircle}>
            <MaterialIcons name="receipt-long" size={56} color="#6346cd" />
          </View>
        </View>

        {/* Title Headline */}
        <Text style={styles.headline}>Scanning receipt for your points</Text>

        {/* Cycling status pill */}
        <Animated.View style={[styles.statusBadge, statusStyle]}>
          <Text style={styles.statusBadgeText}>
            {STATUS_MESSAGES[statusIndex]}
          </Text>
        </Animated.View>

        {/* Indeterminate progress bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, progressStyle]} />
        </View>
      </View>

      {/* Footer containing skip button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => {
            // Skip -> replace back to standard challenges list
            router.replace('/(tabs)/challenges');
          }}
          activeOpacity={0.8}
          style={styles.skipButton}
        >
          <Text style={styles.skipButtonText}>SKIP FOR NOW</Text>
        </TouchableOpacity>
        <Text style={styles.captionText}>Check Rewards page for status</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf4ff', // soft surface container
  },
  bgScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: 'rgba(99, 70, 205, 0.08)',
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  logoBlockContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: 'rgba(99, 70, 205, 0.4)',
  },
  spinningSegment: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#6346cd',
    borderRightColor: '#6346cd',
  },
  logoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#ffffff', // surface-container-lowest
    alignItems: 'center',
    justifyContent: 'center',
    // Signature Glow Shadow
    shadowColor: '#6346cd',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  accentDotSecondary: {
    position: 'absolute',
    top: 10,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6e45ac', // secondary brand
    opacity: 0.55,
  },
  accentDotTertiary: {
    position: 'absolute',
    bottom: 12,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9b3664', // tertiary brand
    opacity: 0.55,
  },
  headline: {
    fontSize: 24,
    fontFamily: 'Outfit_600SemiBold',
    color: '#36274d',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
    textShadowColor: 'rgba(99, 70, 205, 0.15)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  statusBadge: {
    backgroundColor: '#dfc8ff', // secondary-container
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 36,
  },
  statusBadgeText: {
    color: '#592f96', // on-secondary-container
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 2.2, // ~0.2em
  },
  progressBarTrack: {
    width: 240,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e8d5ff', // surface-container-highest
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 80,
    height: '100%',
    backgroundColor: '#6346cd', // primary fill
    borderRadius: 3,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 32,
    zIndex: 2,
  },
  skipButton: {
    width: '100%',
    maxWidth: 240,
    borderWidth: 1.5,
    borderColor: '#6e45ac', // secondary border
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    color: '#6e45ac', // secondary text
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    letterSpacing: 1.8,
  },
  captionText: {
    color: '#64547d', // on-surface-variant
    fontSize: 12,
    fontFamily: 'Manrope',
    fontWeight: '500',
  },
});

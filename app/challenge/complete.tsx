import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
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
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

// Import primitives & mock data
import { mockUserPoints, mockDailyChallenge, mockDailyChallenges, mockStandardChallenges, mockGroupChallenge, mockGroupChallenges, mockReferralChallenge } from '../../data/mockChallenges';
import PrimaryButton from '../../components/challenges/PrimaryButton';
import Confetti from '../../components/challenges/Confetti';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChallengeCompleteScreen() {
  const router = useRouter();
  const { challengeId, points } = useLocalSearchParams();
  const idStr = Array.isArray(challengeId) ? challengeId[0] : (challengeId || '');
  const pointsAwarded = Number(Array.isArray(points) ? points[0] : (points || 0));

  // Animating values
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const sparkleBounce1 = useSharedValue(0);
  const sparkleBounce2 = useSharedValue(0);

  // Setup loop animations
  useEffect(() => {
    // Pulse animation behind trophy badge
    pulseScale.value = withRepeat(
      withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Sparkles gentle float/bounce
    sparkleBounce1.value = withRepeat(
      withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    sparkleBounce2.value = withRepeat(
      withTiming(6, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Lookup challenge details
  const getChallenge = (id: string) => {
    if (!id) return null;
    if (mockDailyChallenge.id === id) return mockDailyChallenge;
    if (mockGroupChallenge.id === id) return mockGroupChallenge;
    if (mockReferralChallenge.id === id) return mockReferralChallenge;

    const daily = mockDailyChallenges.find((c) => c.id === id);
    if (daily) return daily;

    const std = mockStandardChallenges.find((c) => c.id === id);
    if (std) return std;

    const grp = mockGroupChallenges.find((c) => c.id === id);
    if (grp) return grp;

    return null;
  };

  const challenge = getChallenge(idStr);
  const challengeTitle = challenge?.title || 'Daily Reward';
  const completedTodayCount = challenge?.completedTodayCount || 340;

  // Points values mapping: starting base + newly awarded points
  const startingBalance = mockUserPoints.total;
  const currentBalance = startingBalance + pointsAwarded;
  const currentStreak = mockUserPoints.streakDays;

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const bounceStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: sparkleBounce1.value }],
  }));

  const bounceStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: sparkleBounce2.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* SVG Radial Glow Blobs */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="orbTopLeft"
            cx="15%"
            cy="15%"
            rx="50%"
            ry="50%"
          >
            <Stop offset="0%" stopColor="#a590ff" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#fcf4ff" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="orbBottomRight"
            cx="85%"
            cy="85%"
            rx="50%"
            ry="50%"
          >
            <Stop offset="0%" stopColor="#ff8cba" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#fcf4ff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#orbTopLeft)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#orbBottomRight)" />
      </Svg>

      {/* Falling Confetti Layer */}
      <Confetti />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy Badge Stack */}
        <View style={styles.trophyWrapper}>
          {/* Pulse Glow Aura Behind */}
          <Animated.View style={[styles.trophyPulseGlow, pulseStyle]} />

          {/* Bounce-animated Sparkle 1: Top Right */}
          <Animated.View style={[styles.sparkle1, bounceStyle1]}>
            <MaterialIcons name="auto-awesome" size={32} color="#9b3664" />
          </Animated.View>

          {/* Bounce-animated Sparkle 2: Bottom Left */}
          <Animated.View style={[styles.sparkle2, bounceStyle2]}>
            <MaterialIcons name="star" size={24} color="#9880ff" />
          </Animated.View>

          {/* Trophy Badge Container */}
          <View style={styles.trophyContainer}>
            <MaterialIcons name="military-tech" size={68} color="#6346cd" />
          </View>
        </View>

        {/* Challenge Complete Headline */}
        <Text style={styles.headline}>CHALLENGE COMPLETE!</Text>

        {/* Reward Point Amount */}
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsPlus}>+</Text>
          <Text style={styles.pointsText}>{pointsAwarded}</Text>
          <Text style={styles.pointsLabel}>PTS</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          You've successfully completed the{' '}
          <Text style={styles.challengeBold}>{challengeTitle}</Text> challenge.
        </Text>

        {/* 2-Column Stat Cards Grid */}
        <View style={styles.statsGrid}>
          {/* LEFT: Point Balance Card */}
          <View style={styles.statCardShadow}>
            <View style={styles.statCardInner}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="account-balance-wallet" size={20} color="#6346cd" />
              </View>
              <Text style={styles.cardLabel}>POINT BALANCE</Text>
              <View style={styles.cardValueContainer}>
                <Text style={styles.cardValue}>{currentBalance}</Text>
                <Text style={styles.cardValueSub}>PTS</Text>
              </View>
            </View>
          </View>

          {/* RIGHT: Streak Card */}
          <View style={[styles.statCardShadow, styles.streakShadow]}>
            <View style={[styles.statCardInner, styles.streakInner]}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="bolt" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.cardLabel, styles.streakLabel]}>CURRENT STREAK</Text>
              <View style={styles.cardValueContainer}>
                <Text style={[styles.cardValue, styles.streakValue]}>{currentStreak}</Text>
                <Text style={[styles.cardValueSub, styles.streakValueSub]}>DAYS</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Stack */}
        <View style={styles.buttonStack}>
          <PrimaryButton
            label="BACK TO CHALLENGES"
            onPress={() => {
              router.replace('/(tabs)/challenges');
            }}
            style={styles.actionBtn}
          />
          <PrimaryButton
            label="VIEW MY REWARDS"
            variant="secondary"
            onPress={() => {
              router.replace('/(tabs)/rewards');
            }}
            style={styles.actionBtn}
          />
        </View>

        {/* Social Proof Pill */}
        <View style={styles.socialProofPill}>
          <View style={styles.avatarsContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: '#ff8cba', zIndex: 3 }]}>
              <Text style={styles.avatarInitials}>JD</Text>
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: '#9880ff', zIndex: 2, marginLeft: -8 }]}>
              <Text style={styles.avatarInitials}>AM</Text>
            </View>
          </View>
          <Text style={styles.socialProofText}>
            {completedTodayCount} PEOPLE COMPLETED TODAY
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf4ff', // soft surface
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  trophyWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 28,
  },
  trophyPulseGlow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2.5,
    borderColor: 'rgba(99, 70, 205, 0.25)',
  },
  sparkle1: {
    position: 'absolute',
    top: 4,
    right: 8,
    zIndex: 2,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 2,
  },
  trophyContainer: {
    width: 128,
    height: 128,
    borderRadius: 32, // rounded-[32px]
    backgroundColor: '#ffffff', // surface-container-lowest
    alignItems: 'center',
    justifyContent: 'center',
    // Signature Glow Shadow
    shadowColor: '#6346cd',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  headline: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    color: '#6346cd', // primary
    letterSpacing: 3.3, // tracking-[0.3em]
    textAlign: 'center',
    marginBottom: 8,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pointsPlus: {
    fontSize: 32,
    fontFamily: 'Outfit_700Bold',
    color: '#6346cd',
    opacity: 0.5,
    marginRight: 2,
    transform: [{ translateY: -16 }],
  },
  pointsText: {
    fontSize: 80,
    fontFamily: 'Manrope',
    fontWeight: '900',
    color: '#36274d', // on-surface
    letterSpacing: -2,
  },
  pointsLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: '#36274d',
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Manrope',
    fontWeight: '500',
    color: '#64547d', // on-surface-variant
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  challengeBold: {
    fontWeight: '800',
    color: '#36274d', // on-surface
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  statCardShadow: {
    width: '48%',
    height: 128,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    // Card Shadow
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    color: '#806f9a', // outline
    letterSpacing: 0.5,
    marginTop: 10,
  },
  cardValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValue: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    color: '#36274d',
  },
  cardValueSub: {
    fontSize: 10,
    fontFamily: 'Manrope',
    fontWeight: '600',
    color: '#36274d',
    marginLeft: 3,
  },
  streakShadow: {
    backgroundColor: '#6346cd', // primary
    shadowColor: '#6346cd',
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  streakInner: {
    backgroundColor: 'transparent',
  },
  streakLabel: {
    color: '#dfc8ff', // primary-fixed (70% opacity look)
  },
  streakValue: {
    color: '#ffffff', // on-primary
  },
  streakValueSub: {
    color: '#ffffff',
  },
  buttonStack: {
    width: '100%',
    gap: 16,
    marginBottom: 36,
  },
  actionBtn: {
    borderRadius: 32, // rounded-[32px]
  },
  socialProofPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 220, 255, 0.45)', // surface-container-high with 50% opacity
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(165, 144, 255, 0.15)',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Outfit_700Bold',
  },
  socialProofText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    color: '#64547d', // on-surface-variant
    letterSpacing: 1.2,
  },
});

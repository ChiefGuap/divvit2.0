import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { useCountdown } from '../../hooks/useCountdown';
import {
  mockDailyChallenge,
  mockDailyChallenges, // Also import mockDailyChallenges, mockGroupChallenges to support dynamic lookup
  mockStandardChallenges,
  mockGroupChallenge,
  mockGroupChallenges,
  mockReferralChallenge,
} from '../../data/mockChallenges';
import { Challenge } from '../../types/challenges'; // Import Challenge type
import PrimaryButton from '../../components/challenges/PrimaryButton';
import HowItWorksStep from '../../components/challenges/HowItWorksStep';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChallengeDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const getChallenge = (challengeId: string) => {
    if (mockDailyChallenge.id === challengeId) return mockDailyChallenge;
    if (mockGroupChallenge.id === challengeId) return mockGroupChallenge;
    if (mockReferralChallenge.id === challengeId) return mockReferralChallenge;
    const std = mockStandardChallenges.find((c) => c.id === challengeId);
    if (std) return std;
    const daily = mockDailyChallenges.find((c) => c.id === challengeId);
    if (daily) return daily;
    const group = mockGroupChallenges.find((c) => c.id === challengeId);
    if (group) return group;
    return null;
  };

  const challenge = getChallenge(id as string);

  const getHowItWorksSteps = (currentChallenge: Challenge) => {
    const brand = currentChallenge.brand || currentChallenge.title;
    if (currentChallenge.id === 'daily-habit-burger') {
      return [
        { title: `Visit ${brand}`, description: 'Head over to any participating location today.' },
        { title: 'Buy a Smash Burger', description: 'Make sure your order includes the qualifying item.' },
        { title: 'Scan your receipt', description: 'Use the button below to capture and submit.' },
      ];
    }
    if (currentChallenge.id === 'std-gor-gai') {
      return [
        { title: `Visit ${brand}`, description: 'Head over to any participating location today.' },
        { title: 'Order Pad-Thai', description: 'Make sure your order includes the qualifying item.' },
        { title: 'Scan your receipt', description: 'Use the button below to capture and submit.' },
      ];
    }
    if (currentChallenge.id === 'std-sushi-saturday') {
      return [
        { title: `Visit ${brand}`, description: 'Head over to any participating location today.' },
        { title: 'Order Cobb Salad', description: 'Make sure your order includes the qualifying item.' },
        { title: 'Scan your receipt', description: 'Use the button below to capture and submit.' },
      ];
    }
    return [
      { title: `Visit ${brand}`, description: 'Head over to any participating location today.' },
      { title: 'Order', description: 'Make sure your order includes any qualifying items.' },
      { title: 'Scan your receipt', description: 'Use the button below to capture and submit.' },
    ];
  };

  // Dynamic ticking countdown
  const countdown = useCountdown(challenge?.endsAt || new Date().toISOString());

  if (!challenge) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#b41340" />
        <Text style={styles.errorTitle}>Challenge Not Found</Text>
        <Text style={styles.errorSubtitle}>The challenge may have expired or is no longer available.</Text>
        <PrimaryButton 
          label="GO BACK" 
          onPress={() => router.back()} 
          style={styles.errorButton}
        />
      </SafeAreaView>
    );
  }

  const brandName = challenge.brand || 'Participating Restaurant';
  const pointsText = `${challenge.points} PTS`;
  const imageUri = challenge.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80';

  const handleScanReceipt = () => {
    router.push({
      pathname: '/challenge/scan',
      params: { challengeId: challenge.id }
    });
  };

  const formatDescription = (desc: string, brandName?: string) => {
    // Escape brand name for regex
    const escapedBrand = brandName ? brandName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') : '';
    const pattern = new RegExp(
      `(${[
        escapedBrand,
        'Save Together!',
        '\\b\\d+\\s*(?:bonus\\s+)?(?:pts|points|PTS)\\b(?: each)?!?'
      ].filter(Boolean).join('|')})`,
      'gi'
    );
    const parts = desc.split(pattern);
    return (
      <Text style={styles.descriptionText}>
        {parts.map((part, index) => {
          if (
            (brandName && part.toLowerCase() === brandName.toLowerCase()) ||
            part === 'Save Together!' ||
            /^\d+\s*(?:bonus\\s+)?(?:pts|points|PTS)/i.test(part)
          ) {
            return (
              <Text key={index} style={styles.boldPrimary}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* 2. Decorative Background Spheres */}
      <LinearGradient
        colors={['rgba(110, 69, 172, 0.08)', 'rgba(110, 69, 172, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sphere1}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(95, 57, 221, 0.12)', 'rgba(95, 57, 221, 0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.sphere2}
        pointerEvents="none"
      />

      {/* Scrollable Content Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + 64, // aligned right below custom header
            paddingBottom: insets.bottom + 76 // clear compact action area
          }
        ]}
      >
        {/* 3. Hero Card */}
        <View style={styles.heroCard}>
          <Image source={{ uri: imageUri }} style={styles.heroImage} />
          
          <LinearGradient
            colors={['transparent', 'rgba(20,5,43,0.7)']}
            style={styles.heroGradient}
          />

          {/* Floating Glass Reward Badge */}
          <BlurView intensity={Platform.OS === 'ios' ? 30 : 80} style={styles.glassBadge} tint="light">
            <View style={styles.badgeLeft}>
              <Text style={styles.badgeMicro}>REWARD</Text>
              <Text style={styles.badgePoints}>{challenge.points} Divvit Points</Text>
            </View>
            <View style={styles.badgeRightCircle}>
              <MaterialIcons name="star" size={16} color="#ffffff" />
            </View>
          </BlurView>
        </View>

        {/* 4. Title & Live Countdown */}
        <View style={styles.metaContainer}>
          <Text style={styles.title}>{challenge.title}</Text>
          
          <View style={styles.countdownRow}>
            <MaterialIcons name="schedule" size={16} color="#a70138" style={{ marginRight: 8 }} />
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>ENDS IN: {countdown.formatted}</Text>
            </View>
          </View>
        </View>

        {/* 5. Description Paragraph */}
        <View style={styles.descriptionContainer}>
          {formatDescription(challenge.description, challenge.brand)}
        </View>

        {/* 6. How It Works Section */}
        <View style={styles.howItWorksContainer}>
          <Text style={styles.sectionHeading}>How it works</Text>
          
          {getHowItWorksSteps(challenge).map((step, idx) => (
            <HowItWorksStep 
              key={idx}
              stepNumber={idx + 1}
              title={step.title}
              description={step.description}
            />
          ))}
        </View>
      </ScrollView>

      {/* 1. Translucent Sticky Custom Header */}
      <BlurView intensity={70} style={[styles.header, { paddingTop: insets.top + 16 }]} tint="light">
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => router.replace('/(tabs)/challenges')}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <MaterialIcons name="arrow-back" size={16} color="#5f39dd" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Challenge Details</Text>
        <View style={styles.headerRight} />
      </BlurView>

      {/* 7. Fixed Bottom Action Button Area with Gradient Fade */}
      <LinearGradient
        colors={['rgba(252,244,255,0)', 'rgba(252,244,255,0.95)', '#fcf4ff']}
        locations={[0, 0.45, 1]}
        style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <PrimaryButton 
          label="SCAN RECEIPT"
          onPress={handleScanReceipt}
          iconName="receipt-long"
          style={styles.ctaButton}
          labelStyle={styles.ctaLabel}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf4ff', // background color token
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fcf4ff',
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#36274d',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    width: 200,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95,57,221,0.06)',
    zIndex: 100,
    backgroundColor: 'rgba(250, 244, 255, 0.9)',
  },
  headerLeft: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 32,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8d5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#4142e3',
    letterSpacing: -0.5,
    textAlign: 'center',
    flex: 1,
  },
  sphere1: {
    position: 'absolute',
    bottom: 99.5,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
  },
  sphere2: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroCard: {
    height: 230, // Increased height for better visual impact
    borderRadius: 32, // rounded-[32px]
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12, // Tighter margin
    backgroundColor: '#ffffff',
    shadowColor: '#7c5afa',
    shadowOpacity: 0.15,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glassBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeLeft: {
    flex: 1,
  },
  badgeMicro: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  badgePoints: {
    fontSize: 16,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#ffffff',
    marginTop: 1,
  },
  badgeRightCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff8cba', // tertiary highlight
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaContainer: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22, // Even more compact font size
    fontFamily: 'Outfit_800ExtraBold',
    color: '#5f39dd', // primary brand purple
    lineHeight: 26,
    letterSpacing: -0.75,
    marginBottom: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  countdownPill: {
    backgroundColor: 'rgba(247, 75, 109, 0.1)',
    borderRadius: 9999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontSize: 11, // Compact size
    fontFamily: 'Manrope_700Bold',
    color: '#a70138',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13, // Compact font size
    fontFamily: 'Manrope_500Medium',
    color: '#64547d',
    lineHeight: 18,
  },
  boldPrimary: {
    color: '#5f39dd',
    fontFamily: 'Manrope_700Bold',
  },
  howItWorksContainer: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14, // Slightly smaller
    fontFamily: 'Manrope_800ExtraBold',
    color: '#36274d',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  ctaButton: {
    backgroundColor: '#5f39dd',
    height: 48, // Compact height
    borderRadius: 32,
    paddingVertical: 0,
    shadowColor: '#5f39dd',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  ctaLabel: {
    fontSize: 14, // Tighter font size
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0,
  },
});

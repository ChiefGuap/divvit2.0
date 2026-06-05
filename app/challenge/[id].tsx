import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCountdown } from '../../hooks/useCountdown';
import {
  mockDailyChallenge,
  mockStandardChallenges,
  mockGroupChallenge,
  mockReferralChallenge,
} from '../../data/mockChallenges';
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
    return null;
  };

  const challenge = getChallenge(id as string);

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
      {/* 2. Decorative Blurred Spheres Background */}
      <View style={styles.sphere1} pointerEvents="none" />
      <View style={styles.sphere2} pointerEvents="none" />

      {/* Scrollable Content Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + 64, // below sticky header
            paddingBottom: insets.bottom + 100 // clear fixed button
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
          
          <View style={styles.countdownPill}>
            <MaterialIcons name="schedule" size={14} color="#b41340" style={styles.scheduleIcon} />
            <Text style={styles.countdownText}>ENDS IN: {countdown.formatted}</Text>
          </View>
        </View>

        {/* 5. Description Paragraph */}
        <View style={styles.descriptionContainer}>
          {formatDescription(challenge.description, challenge.brand)}
        </View>

        {/* 6. How It Works Section */}
        <View style={styles.howItWorksContainer}>
          <Text style={styles.sectionHeading}>How it works</Text>
          
          <HowItWorksStep 
            stepNumber={1}
            title={`Visit ${brandName}`}
            description="Head over to any participating location today."
          />
          <HowItWorksStep 
            stepNumber={2}
            title="Order"
            description="Make sure your order includes any qualifying items."
          />
          <HowItWorksStep 
            stepNumber={3}
            title="Scan your receipt"
            description="Use the button below to capture and submit."
          />
        </View>
      </ScrollView>

      {/* 1. Translucent Sticky Custom Header */}
      <BlurView intensity={70} style={[styles.header, { paddingTop: insets.top }]} tint="light">
        <Pressable 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={20} color="#6346cd" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenge Details</Text>
        <View style={styles.headerSpacer} />
      </BlurView>

      {/* 7. Fixed Bottom Action Button Area with Gradient Fade */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          colors={['transparent', '#fcf4ff']}
          style={styles.bottomFade}
          pointerEvents="none"
        />
        <PrimaryButton 
          label="SCAN RECEIPT"
          onPress={handleScanReceipt}
          iconName="receipt-long"
        />
      </View>
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
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95,57,221,0.06)',
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1e3ff', // surface-container-high
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#6346cd', // primary
  },
  headerSpacer: {
    width: 40,
  },
  sphere1: {
    position: 'absolute',
    top: 120,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(95,57,221,0.08)', // low opacity primary blob
  },
  sphere2: {
    position: 'absolute',
    top: 250,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(155,54,100,0.08)', // low opacity secondary/tertiary blob
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroCard: {
    height: 240,
    borderRadius: 32, // rounded-[32px]
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
    shadowColor: '#36274d',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  badgeLeft: {
    flex: 1,
  },
  badgeMicro: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badgePoints: {
    fontSize: 16,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#ffffff',
    marginTop: 2,
  },
  badgeRightCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff8cba', // tertiary-fixed / tertiary highlight
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#6346cd', // primary
    lineHeight: 34,
    marginBottom: 10,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffeff2', // error-container/10 bg tint
    borderRadius: 9999,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(180,19,64,0.06)',
  },
  scheduleIcon: {
    marginRight: 6,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#b41340', // error-dim
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    marginBottom: 28,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d', // on-surface-variant
    lineHeight: 22,
  },
  boldPrimary: {
    color: '#6346cd',
    fontFamily: 'Manrope_700Bold',
  },
  howItWorksContainer: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#36274d', // on-background
    marginBottom: 16,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: 'transparent',
    zIndex: 90,
  },
  bottomFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
  },
});

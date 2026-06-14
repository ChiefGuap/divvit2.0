import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TabHeader from '@/components/TabHeader';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardsContext';
import { useCountdown } from '../../hooks/useCountdown';
import DailyChallengeCarousel from '../../components/challenges/DailyChallengeCarousel';
import ChallengeRow from '../../components/challenges/ChallengeRow';
import GroupChallengeCard from '../../components/challenges/GroupChallengeCard';
import ReferralCard from '../../components/challenges/ReferralCard';
import {
  mockDailyChallenges,
  mockStandardChallenges,
  mockGroupChallenges,
} from '../../data/mockChallenges';

const ChallengesComingSoon = () => {
  return (
    <SafeAreaView style={comingSoonStyles.container} edges={['top']}>
      <TabHeader points={0} />

      <View style={comingSoonStyles.content}>
        <View style={comingSoonStyles.iconContainer}>
          <Text style={comingSoonStyles.icon}>🏆</Text>
        </View>

        <Text style={comingSoonStyles.title}>Coming Soon</Text>

        <Text style={comingSoonStyles.subtitle}>
          Fun challenges and bonus rewards{'\n'}
          are on their way to Divvit.
        </Text>

        <View style={comingSoonStyles.badge}>
          <Text style={comingSoonStyles.badgeText}>🚀  Launching Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default function ChallengesScreen() {
  const { points, refresh } = useRewards();
  const { user } = useAuth();

  const IS_PRODUCTION = !__DEV__;

  if (IS_PRODUCTION) {
    return <ChallengesComingSoon />;
  }

  // Refresh points when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refresh();
      }
    }, [user?.id, refresh])
  );

  // Connect useCountdown to Daily Challenge endsAt
  const dailyCountdown = useCountdown(mockDailyChallenges[0].endsAt);

  const handleViewAllStandard = () => {
    console.log('TODO: View All standard challenges pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TopAppBar */}
      <TabHeader points={points ?? 0} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Daily Challenge Hero ─────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Daily Challenge</Text>
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>
                ENDS IN: {dailyCountdown.formatted}
              </Text>
            </View>
          </View>
        </View>

        <DailyChallengeCarousel data={mockDailyChallenges} />

        {/* ── Divvit Challenges ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Divvit Challenges</Text>
            <Text style={styles.sectionSubtitle}>EARN MORE POINTS!</Text>
          </View>
          <Text style={styles.viewAllLink} onPress={handleViewAllStandard}>
            View All
          </Text>
        </View>

        <View style={styles.challengesList}>
          {mockStandardChallenges.map((item) => (
            <ChallengeRow key={item.id} item={item} />
          ))}
        </View>

        {/* ── Group Challenges ─────────────────────────── */}
        <View style={styles.groupSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Group Challenges</Text>
          </View>
          <GroupChallengeCard data={mockGroupChallenges} />
        </View>

        {/* ── Refer a Friend ──────────────────────────── */}
        <View style={styles.referralWrap}>
          <ReferralCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf4ff', // surface / background
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },

  /* Section header row */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#36274d', // on-surface
    letterSpacing: -0.6,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#806f9a', // outline
    letterSpacing: 2.2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  viewAllLink: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#5f39dd', // primary
  },

  /* Countdown pill */
  countdownPill: {
    backgroundColor: '#ecdcff', // surface-container-high
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#806f9a', // outline
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },

  /* Lists */
  challengesList: {
    paddingHorizontal: 24,
    marginBottom: 8,
    rowGap: 16,                           // 16px spacing between items
  },
  groupSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  referralWrap: {
    paddingHorizontal: 24,
    marginBottom: 48,
  },
});

/* ── Coming Soon placeholder ────────────────────────── */
const comingSoonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf4ff' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1e3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    opacity: 0.5,
  },
  icon: { fontSize: 44 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#806f9a',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#806f9a',
    fontFamily: 'Outfit_500Medium',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  badge: {
    backgroundColor: '#f1e3ff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#806f9a',
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
});

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TabHeader from '@/components/TabHeader';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardsContext';
import { useCountdown } from '../../hooks/useCountdown';
import SectionHeader from '../../components/challenges/SectionHeader';
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
        
        <Text style={comingSoonStyles.title}>
          Coming Soon
        </Text>
        
        <Text style={comingSoonStyles.subtitle}>
          Fun challenges and bonus rewards{'\n'}
          are on their way to Divvit.
        </Text>
        
        <View style={comingSoonStyles.badge}>
          <Text style={comingSoonStyles.badgeText}>
            🚀  Launching Soon
          </Text>
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
    // TODO: Navigate to view all standard challenges page
    console.log('TODO: View All standard challenges pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* App Shell Header */}
      <TabHeader points={points ?? 0} />
      
      {/* Scrollable Body Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Daily Challenge Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Daily Challenge</Text>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>
              ENDS IN: {dailyCountdown.formatted}
            </Text>
          </View>
        </View>

        {/* 2. Daily Challenge Carousel */}
        <DailyChallengeCarousel data={mockDailyChallenges} />

        {/* 3. Divvit Challenges Section Header */}
        <View style={styles.sectionHeaderWrap}>
          <SectionHeader 
            title="Divvit Challenges"
            subtitle="EARN MORE POINTS!"
            onViewAllPress={handleViewAllStandard}
          />
        </View>

        {/* 4. Standard Challenges List */}
        <View style={styles.listContainer}>
          {mockStandardChallenges.map((item, index) => (
            <ChallengeRow 
              key={item.id}
              item={item}
              pointsColor={index % 2 === 0 ? 'primary' : 'tertiary'}
            />
          ))}
        </View>

        {/* 5. Group Challenges Section */}
        <View style={styles.sectionHeaderWrap}>
          <SectionHeader title="Group Challenges" />
        </View>

        {/* 6. Group Challenge Carousel */}
        <GroupChallengeCard data={mockGroupChallenges} />

        {/* 7. Referral Card */}
        <View style={styles.referralContainer}>
          <ReferralCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf4ff', // background color token
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 110, // clears bottom navigation bar
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#36274d', // on-surface
    letterSpacing: -0.5,
  },
  sectionHeaderWrap: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  countdownBadge: {
    backgroundColor: '#f1e3ff', // surface-container
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  countdownText: {
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#806f9a', // outline
    letterSpacing: 1.5,
  },
  listContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  referralContainer: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
});

const comingSoonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf4ff',
  },
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
  icon: {
    fontSize: 44,
  },
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

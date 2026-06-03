import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TabHeader from '@/components/TabHeader';
import { useRewards } from '../../context/RewardsContext';

export default function ChallengesScreen() {
  const { points } = useRewards();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TabHeader points={points ?? 0} />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚡</Text>
        </View>
        
        <Text style={styles.title}>Challenges</Text>
        
        <Text style={styles.subtitle}>
          Complete challenges to earn bonus points{'\n'}
          and unlock exclusive rewards.
        </Text>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🚀  Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9ff',
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
    backgroundColor: '#f1f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6346cd',
    fontFamily: 'Outfit',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#484554',
    fontFamily: 'Outfit',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  badge: {
    backgroundColor: '#f1f3ff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6346cd',
    fontFamily: 'Outfit',
    letterSpacing: 0.5,
  },
});

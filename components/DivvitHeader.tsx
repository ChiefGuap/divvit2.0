import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useRewards } from '../context/RewardsContext';
import DivvitLogo from './DivvitLogo';

export default function DivvitHeader() {
  const router = useRouter();
  const { points } = useRewards();

  const handlePillPress = () => {
    router.push('/(tabs)/rewards');
  };

  return (
    <View style={styles.header}>
      <DivvitLogo />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePillPress}
        style={styles.pill}
      >
        <Sparkles size={14} color="#6346cd" />
        {points === null ? (
          <View style={styles.pillSkeleton} />
        ) : (
          <Text style={styles.pillText}>{points} PTS</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: '#f9f9ff',
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6346cd',
    letterSpacing: -0.5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1f3ff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6346cd',
    letterSpacing: 0.5,
  },
  pillSkeleton: {
    width: 44,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
});

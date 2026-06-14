import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PointsStreakBarProps {
  totalPoints: number;
  streakDays: number;
}

export default function PointsStreakBar({ totalPoints, streakDays }: PointsStreakBarProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(99, 70, 205, 0.06)', 'rgba(155, 54, 100, 0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Left: Points display */}
      <View style={styles.pointsSection}>
        <Text style={styles.starIcon}>✦</Text>
        <Text style={styles.pointsValue}>{totalPoints}</Text>
        <Text style={styles.pointsLabel}>PTS</Text>
      </View>

      {/* Vertical divider */}
      <View style={styles.divider} />

      {/* Right: Streak display */}
      <View style={styles.streakSection}>
        <Text style={styles.flameIcon}>🔥</Text>
        <Text style={styles.streakValue}>{streakDays}</Text>
        <Text style={styles.streakLabel}>DAY STREAK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 70, 205, 0.12)',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    // Subtle glow shadow
    shadowColor: '#6346cd',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pointsSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  starIcon: {
    fontSize: 16,
    color: '#6346cd',
  },
  pointsValue: {
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#36274d',
    letterSpacing: -1,
  },
  pointsLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#806f9a',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(128, 111, 154, 0.2)',
    marginHorizontal: 16,
  },
  streakSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  flameIcon: {
    fontSize: 16,
  },
  streakValue: {
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#36274d',
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#806f9a',
    letterSpacing: 0.5,
  },
});

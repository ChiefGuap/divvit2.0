import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface TabHeaderProps {
  points?: number;
}

export default function TabHeader({ points = 0 }: TabHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>Divvit</Text>
      <TouchableOpacity
        style={styles.pointsBadge}
        onPress={() => router.push('/(tabs)/rewards')}
        activeOpacity={0.8}
      >
        <Text style={styles.badgeIcon}>✦</Text>
        <Text style={styles.badgeText}>{points} PTS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 8,
    backgroundColor: '#f9f9ff',
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6346cd',
    fontFamily: 'Outfit',
    letterSpacing: -0.5,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIcon: {
    fontSize: 12,
    color: '#6346cd',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6346cd',
    fontFamily: 'Outfit',
  },
});

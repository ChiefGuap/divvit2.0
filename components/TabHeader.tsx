import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { User } from 'lucide-react-native';

interface TabHeaderProps {
  points?: number;
}

export default function TabHeader({ points = 0 }: TabHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>Divvit</Text>
      <View style={styles.rightHeader}>
        <TouchableOpacity
          style={styles.pointsBadge}
          onPress={() => router.push('/(tabs)/rewards')}
          activeOpacity={0.8}
        >
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>{points} PTS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <User size={22} color="#6346cd" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6346cd',
    fontFamily: 'Outfit',
    letterSpacing: -0.5,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6deff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeIcon: {
    fontSize: 12,
    color: '#4a28b3',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4a28b3',
    fontFamily: 'Outfit',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#141b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginLeft: 10,
  },
});

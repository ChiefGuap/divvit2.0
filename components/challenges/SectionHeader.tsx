import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewAllPress?: () => void;
}

export default function SectionHeader({
  title,
  subtitle,
  onViewAllPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
      </View>
      {onViewAllPress && (
        <TouchableOpacity onPress={onViewAllPress} activeOpacity={0.7}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  leftContent: {
    flex: 1,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#806f9a', // outline color token
    letterSpacing: 2,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold', // heaviest weight supported by Manrope
    color: '#36274d', // on-background color token
    letterSpacing: -0.5,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#6346cd', // primary
  },
});

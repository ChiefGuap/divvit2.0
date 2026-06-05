import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HowItWorksStepProps {
  stepNumber: number;
  title: string;
  description: string;
}

export default function HowItWorksStep({
  stepNumber,
  title,
  description,
}: HowItWorksStepProps) {
  return (
    <View style={styles.card}>
      {/* Numbered Chip on the left */}
      <View style={styles.numberChip}>
        <Text style={styles.numberText}>{stepNumber}</Text>
      </View>

      {/* Text Details */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 24, // rounded-[24px]
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    // Soft shadow
    shadowColor: '#36274d',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(95,57,221,0.03)',
  },
  numberChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6deff', // primary-container/30 low tint background
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 15,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#6346cd', // primary
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#36274d', // on-background
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d', // on-surface-variant
    lineHeight: 18,
  },
});

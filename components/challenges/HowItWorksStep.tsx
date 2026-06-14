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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    minHeight: 70,
    marginBottom: 6,
    // Signature Drop Shadow matching drop-shadow-[0px_10px_15px_rgba(95,57,221,0.05)]
    shadowColor: '#5f39dd',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8edff',
  },
  numberChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(165, 144, 255, 0.3)', // Overlay color
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#5f39dd', // Purple number color
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#36274d', // heading-color
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d', // description text color
    lineHeight: 16,
  },
});

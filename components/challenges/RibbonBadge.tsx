import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RibbonBadgeProps {
  text: string;
}

export default function RibbonBadge({ text }: RibbonBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.ribbon}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 90,
    height: 90,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 15,
    right: -25,
    width: 120,
    backgroundColor: '#6346cd', // primary bg
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  text: {
    color: '#f6f0ff', // on-primary
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

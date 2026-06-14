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
    width: 96,  // w-24
    height: 96, // h-24
    overflow: 'hidden',
    zIndex: 20,
  },
  ribbon: {
    position: 'absolute',
    top: 10,
    right: -30,
    width: 128, // w-32
    backgroundColor: '#6346cd',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    // shadow-lg
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

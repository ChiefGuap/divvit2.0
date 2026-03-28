import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DivvitHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>Divvit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f9f9ff',
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4b29b4',
    letterSpacing: -0.5,
  },
});

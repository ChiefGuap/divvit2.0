import React from 'react';
import { Text, StyleSheet } from 'react-native';

export default function DivvitLogo() {
  return (
    <Text style={styles.logo}>Divvit</Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6346cd',
    fontFamily: 'Outfit',
    letterSpacing: -0.5,
  },
});

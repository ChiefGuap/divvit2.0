import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RibbonBadge from './RibbonBadge';

export default function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const referralLink = 'divvit.app/u/opendivvit';

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      setCopied(true);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join me on Divvit to split bills instantly and earn rewards! Use my link: ${referralLink}`,
      });
    } catch (err) {
      console.warn('Error sharing link:', err);
    }
  };

  return (
    <View style={styles.cardOuter}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(95, 57, 221, 0.05)', 'rgba(110, 69, 172, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ribbon badge */}
      <RibbonBadge text="25 PTS" />

      {/* Icon circle — diversity_3 matching template */}
      <View style={styles.iconCircle}>
        <MaterialIcons name="diversity-3" size={30} color="#5f39dd" />
      </View>

      {/* Header */}
      <Text style={styles.title}>Refer a Friend</Text>
      <Text style={styles.subtitle}>
        Invite your friend to Divvit and you'll both receive more points!
      </Text>

      {/* Link chip + share button */}
      <View style={styles.actions}>
        {/* Copyable link row */}
        <TouchableOpacity
          onPress={handleCopyLink}
          activeOpacity={0.85}
          style={styles.linkRow}
        >
          <Text style={styles.linkText} numberOfLines={1}>
            {referralLink}
          </Text>
          <View style={styles.copyIconWrap}>
            <MaterialIcons
              name={copied ? 'check-circle' : 'content-copy'}
              size={22}
              color={copied ? '#16a34a' : '#5f39dd'}
            />
          </View>
        </TouchableOpacity>

        {/* Share CTA */}
        <TouchableOpacity
          onPress={handleShareLink}
          activeOpacity={0.85}
          style={styles.shareButton}
        >
          <MaterialIcons name="send" size={18} color="#f6f0ff" />
          <Text style={styles.shareLabel}>SHARE INVITE LINK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  cardOuter: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(95, 57, 221, 0.20)', // primary/20
    overflow: 'hidden',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 40,
    // shadow-xl shadow-primary/5
    shadowColor: '#5f39dd',
    shadowOpacity: 0.05,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  /* Icon */
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(165, 144, 255, 0.30)', // primary-container/30
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 8,
  },

  /* Text */
  title: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#36274d',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  /* Actions */
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8edff', // surface-container-low
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(184, 165, 211, 0.40)', // outline-variant/40
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#5f39dd',
    textAlign: 'left',
  },
  copyIconWrap: {
    padding: 8,
    borderRadius: 8,
  },

  /* Share button */
  shareButton: {
    width: '100%',
    backgroundColor: '#5f39dd',
    borderRadius: 48,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#5f39dd',
    shadowOpacity: 0.40,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  sharePressed: {
    transform: [{ scale: 0.98 }],
  },
  shareLabel: {
    color: '#f6f0ff',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

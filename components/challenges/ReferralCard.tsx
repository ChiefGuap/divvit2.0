import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RibbonBadge from './RibbonBadge';
import PrimaryButton from './PrimaryButton';

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
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
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
    <View style={styles.cardShadow}>
      <View style={styles.cardInner}>
        {/* Background Gradient matching the spec */}
        <LinearGradient
          colors={['rgba(95, 57, 221, 0.05)', 'rgba(110, 69, 172, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Ribbon Badge */}
        <RibbonBadge text="25 PTS" />

        {/* Decorative Center Avatar Circle (matching bg-primary-container/30 and groups icon) */}
        <View style={styles.avatarContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="groups" size={32} color="#6346cd" />
          </View>
        </View>

        {/* Header & Body Content */}
        <Text style={styles.title}>Refer a Friend</Text>
        <Text style={styles.subtitle}>
          Invite your friend to Divvit and you'll both receive more points!
        </Text>

        {/* Copyable Link Chip */}
        <View style={styles.linkContainer}>
          <Pressable 
            onPress={handleCopyLink}
            style={styles.linkChip}
          >
            <Text style={styles.linkText} numberOfLines={1}>
              {referralLink}
            </Text>
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name={copied ? 'check-circle' : 'content-copy'} 
                size={18} 
                color={copied ? '#16a34a' : '#6346cd'} 
              />
              {copied && <Text style={styles.copiedText}>Copied</Text>}
            </View>
          </Pressable>

          {/* Share Invite Button */}
          <PrimaryButton 
            label="SHARE INVITE LINK"
            onPress={handleShareLink}
            iconName="send"
            style={styles.shareButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 24, // rounded-lg / xl matching other cards
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(99, 70, 205, 0.2)', // border-primary/20 matching #6346cd
    // Signature Glow Shadow - more prominent
    shadowColor: '#6346cd',
    shadowOpacity: 0.22,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardInner: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  avatarContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(165, 144, 255, 0.25)', // bg-primary-container/30 equivalent
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#36274d', // on-surface
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d', // on-surface-variant
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  linkContainer: {
    width: '100%',
    maxWidth: 320, // max-w-sm in HTML spec
    flexDirection: 'column',
    gap: 12,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8edff', // surface-container-low
    borderRadius: 12, // rounded-xl
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(184, 165, 211, 0.4)', // border-outline-variant/40
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#6346cd', // primary
    flex: 1,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copiedText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#16a34a',
  },
  shareButton: {
    width: '100%',
  },
});

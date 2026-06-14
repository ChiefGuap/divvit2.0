import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { GroupChallenge } from '../../types/challenges';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface GroupChallengeCardProps {
  data: GroupChallenge[];
}

export default function GroupChallengeCard({ data }: GroupChallengeCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePress = (id: string) => {
    router.push(`/challenge/${id}`);
  };

  /* ── Rich-text description ─────────────────────── */
  const renderDescription = (desc: string) => {
    const pattern = /(\b\d+\s*(?:bonus\s+)?(?:pts|points|PTS)\b(?: each)?!?)/gi;
    const parts = desc.split(pattern);
    return (
      <Text style={styles.description}>
        {parts.map((part, i) => {
          if (/^\d+\s*(?:bonus\s+)?(?:pts|points|PTS)/i.test(part))
            return (
              <Text key={i} style={styles.ptsHighlight}>
                {part}
              </Text>
            );
          return part;
        })}
      </Text>
    );
  };

  /* ── Card renderer ─────────────────────────────── */
  const renderItem = ({ item }: { item: GroupChallenge }) => (
    <View style={styles.cardOuter}>
      {/* Glow layer (outside the clipped container) */}
      <View style={styles.glowLayer} />

      {/* Clipped Card Container (forces rounded corners) */}
      <View style={styles.cardClipContainer}>
        <View style={styles.cardContent}>
          {/* Banner */}
          <View style={styles.banner}>
            <MaterialIcons
              name="groups"
              size={60}
              color="rgba(155, 54, 100, 0.30)"
              style={styles.bannerIcon}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.60)']}
              style={styles.bannerGradient}
            />
            <Text style={styles.bannerTitle}>{item.title}</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {renderDescription(item.description)}

            {/* CTA */}
            <TouchableOpacity
              onPress={() => handlePress(item.id)}
              activeOpacity={0.85}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaLabel}>VIEW TEAM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listPad}
        onScroll={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16),
          );
          if (idx >= 0 && idx < data.length) setActiveIndex(idx);
        }}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    marginBottom: 8,
  },
  listPad: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  /* Card wrapper */
  cardOuter: {
    width: CARD_WIDTH,
    marginRight: 16,
    position: 'relative',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'transparent',
    shadowColor: '#9b3664',
    shadowOpacity: 0.10,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 20 },
    elevation: 14,
  },
  cardClipContainer: {
    width: '100%',
    borderRadius: 48,
    overflow: 'hidden',                  // Clip children to round shape
    backgroundColor: '#ffffff',
  },
  cardContent: {
    width: '100%',
  },

  /* Banner */
  banner: {
    height: 160,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(140, 41, 88, 0.10)', // tertiary-dim/10
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
  },
  bannerIcon: {
    position: 'absolute',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  bannerTitle: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.5,
  },

  /* Body */
  body: {
    padding: 16,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    backgroundColor: '#ffffff',
  },
  description: {
    fontSize: 16,
    color: '#64547d',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 26,
    marginBottom: 24,
  },
  ptsHighlight: {
    color: '#9b3664', // tertiary
    fontFamily: 'Manrope_800ExtraBold',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#9b3664', // Inline absolute tertiary color
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9b3664',
    shadowOpacity: 0.20,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  ctaLabel: {
    color: '#ffeff2', // on-tertiary
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  /* Dots */
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#9b3664', // tertiary
  },
  dotInactive: {
    backgroundColor: '#b8a5d3', // outline-variant
  },
});

import React, { useState } from 'react';
import {
  View,
  FlatList,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Challenge } from '../../types/challenges';
import RibbonBadge from './RibbonBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48; // px-6 on each side

interface DailyChallengeCarouselProps {
  data: Challenge[];
}

export default function DailyChallengeCarousel({
  data,
}: DailyChallengeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePress = (id: string) => {
    router.push(`/challenge/${id}`);
  };

  /* ── Rich-text description ─────────────────────── */
  const renderDescription = (desc: string, brand?: string) => {
    const escaped = brand
      ? brand.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      : '';
    const pattern = new RegExp(
      `(${[escaped, '\\b\\d+\\s*(?:bonus\\s+)?(?:pts|points|PTS)\\b(?: each)?!?']
        .filter(Boolean)
        .join('|')})`,
      'gi',
    );
    const parts = desc.split(pattern);

    return (
      <Text style={styles.description}>
        {parts.map((part, i) => {
          if (brand && part.toLowerCase() === brand.toLowerCase())
            return (
              <Text key={i} style={styles.brandHighlight}>
                {part}
              </Text>
            );
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
  const renderItem = ({ item }: { item: Challenge }) => {
    const imageUri =
      item.imageUrl ||
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80';

    return (
      <View style={styles.cardOuter}>
        {/* Glow layer (outside the clipped container) */}
        <View style={styles.glowLayer} />

        {/* Clipped Card Container (forces rounded corners) */}
        <View style={styles.cardClipContainer}>
          <View style={styles.cardContent}>
            {/* Image banner */}
            <View style={styles.imageBanner}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.60)']}
                style={styles.imageGradient}
              />
              <Text style={styles.heroTitle}>{item.title}</Text>

              {/* Ribbon badge */}
              <RibbonBadge text={`${item.points}pts`} />
            </View>

            {/* Body */}
            <View style={styles.body}>
              {renderDescription(item.description, item.brand)}

              {/* CTA Button */}
              <TouchableOpacity
                onPress={() => handlePress(item.id)}
                activeOpacity={0.85}
                style={styles.ctaButton}
              >
                <MaterialIcons
                  name="receipt-long"
                  size={18}
                  color="#f6f0ff"
                  style={styles.ctaIcon}
                />
                <Text style={styles.ctaLabel}>SCAN RECEIPT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
    marginBottom: 28,
  },
  listPad: {
    paddingHorizontal: 24,
    paddingBottom: 16,
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
    shadowColor: '#7c5afa',
    shadowOpacity: 0.10,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 20 },
    elevation: 14,
  },
  cardClipContainer: {
    width: '100%',
    borderRadius: 48,
    overflow: 'hidden',                  // This standard View will strictly clip children
    backgroundColor: '#ffffff', // surface-container-lowest
  },
  cardContent: {
    width: '100%',
  },

  /* Image banner */
  imageBanner: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%', // gradient starts below middle
  },
  heroTitle: {
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
    color: '#64547d', // on-surface-variant
    fontFamily: 'Manrope_500Medium',
    lineHeight: 26,
    marginBottom: 24,
  },
  brandHighlight: {
    color: '#5f39dd', // primary
    fontFamily: 'Manrope_700Bold',
  },
  ptsHighlight: {
    color: '#6e45ac', // secondary
    fontFamily: 'Manrope_800ExtraBold',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#5f39dd', // Inline absolute purple color
    borderRadius: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    // Shadow configuration
    shadowColor: '#5f39dd',
    shadowOpacity: 0.20,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  ctaIcon: {
    // spacing handled by gap
  },
  ctaLabel: {
    color: '#f6f0ff', // on-primary
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
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#5f39dd', // primary
  },
  dotInactive: {
    backgroundColor: '#b8a5d3', // outline-variant
  },
});

import React, { useState } from 'react';
import { View, FlatList, Image, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Challenge } from '../../types/challenges';
import RibbonBadge from './RibbonBadge';
import PrimaryButton from './PrimaryButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface DailyChallengeCarouselProps {
  data: Challenge[];
}

export default function DailyChallengeCarousel({ data }: DailyChallengeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePressCard = (id: string) => {
    router.push(`/challenge/${id}`);
  };

  const renderDescription = (desc: string, brand?: string) => {
    const escapedBrand = brand ? brand.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') : '';
    const pattern = new RegExp(
      `(${[escapedBrand, '\\b\\d+\\s*(?:bonus\\s+)?(?:pts|points|PTS)\\b(?: each)?!?'].filter(Boolean).join('|')})`,
      'gi'
    );
    const parts = desc.split(pattern);

    return (
      <Text style={styles.description}>
        {parts.map((part, index) => {
          if (brand && part.toLowerCase() === brand.toLowerCase()) {
            return (
              <Text key={index} style={styles.boldPrimary}>
                {part}
              </Text>
            );
          }
          if (/^\d+\s*(?:bonus\s+)?(?:pts|points|PTS)/i.test(part)) {
            return (
              <Text key={index} style={styles.boldSecondary}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderItem = ({ item }: { item: Challenge }) => {
    // Habit Burger mock image fallback if none provided
    const imageUri = item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80';

    return (
      <View style={styles.cardShadow}>
        <Pressable 
          onPress={() => handlePressCard(item.id)}
          style={({ pressed }) => [
            styles.cardInner,
            pressed && styles.pressedCard
          ]}
        >
          {/* Top Image Section */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.gradient}
            />
            
            {/* Overlaid Title */}
            <Text style={styles.overlaidTitle}>{item.title}</Text>
            
            {/* Ribbon Badge */}
            <RibbonBadge text={`${item.points} PTS`} />
          </View>

          {/* Bottom Details Section */}
          <View style={styles.detailsContainer}>
            {renderDescription(item.description, item.brand)}
            
            <PrimaryButton 
              label={item.ctaLabel || 'SCAN RECEIPT'} 
              onPress={() => handlePressCard(item.id)}
              iconName="receipt-long"
              style={styles.button}
            />
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
          if (index >= 0 && index < data.length) {
            setActiveIndex(index);
          }
        }}
      />
      
      {/* Dot Indicators */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((i) => {
          const isActive = data.length > 1 ? activeIndex === i : i === 0;
          return (
            <View 
              key={i} 
              style={[
                styles.dot, 
                isActive ? styles.activeDot : styles.inactiveDot
              ]} 
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  cardShadow: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 24, // rounded-lg / xl matching the card style
    marginRight: 16,
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
    backgroundColor: '#ffffff',
  },
  pressedCard: {
    opacity: 0.95,
  },
  imageContainer: {
    height: 160, // h-40 in HTML spec
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  overlaidTitle: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -0.5,
  },
  detailsContainer: {
    padding: 20,
    alignItems: 'stretch', // stretch button full width
  },
  description: {
    fontSize: 14,
    color: '#64547d', // on-surface-variant
    textAlign: 'left', // left-aligned matching HTML and screenshot
    lineHeight: 22,
    marginBottom: 20,
    fontFamily: 'Manrope_500Medium',
  },
  boldPrimary: {
    color: '#6346cd', // primary color token
    fontFamily: 'Manrope_700Bold',
  },
  boldSecondary: {
    color: '#6346cd', // primary color token (updated from red/maroon)
    fontFamily: 'Outfit_800ExtraBold',
  },
  button: {
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#6346cd', // primary
  },
  inactiveDot: {
    backgroundColor: '#e8d5ff', // surface-variant
  },
});

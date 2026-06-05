import React, { useState } from 'react';
import { View, FlatList, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
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

  const handlePressTeam = (id: string) => {
    // Navigate to challenge details or group team placeholder
    router.push(`/challenge/${id}`);
  };

  const renderDescription = (desc: string) => {
    const pattern = /(\b\d+\s*(?:bonus\s+)?(?:pts|points|PTS)\b(?: each)?!?)/gi;
    const parts = desc.split(pattern);
    return (
      <Text style={styles.description}>
        {parts.map((part, index) => {
          if (/^\d+\s*(?:bonus\s+)?(?:pts|points|PTS)/i.test(part)) {
            return (
              <Text key={index} style={styles.boldTertiary}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderItem = ({ item }: { item: GroupChallenge }) => {
    return (
      <View style={styles.cardShadow}>
        <Pressable 
          onPress={() => handlePressTeam(item.id)}
          style={({ pressed }) => [
            styles.cardInner,
            pressed && styles.pressedCard
          ]}
        >
          {/* Banner Section with Centered Icon & Bottom Legibility Overlay */}
          <View style={styles.bannerContainer}>
            <MaterialIcons 
              name="groups" 
              size={72} 
              color="rgba(155, 54, 100, 0.3)" 
              style={styles.groupIcon}
            />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={styles.gradientOverlay}
            />
            
            {/* Overlaid Title */}
            <Text style={styles.overlaidTitle}>{item.title}</Text>
          </View>

          {/* Bottom Details Section */}
          <View style={styles.detailsContainer}>
            {renderDescription(item.description)}
            


            {/* Tertiary Action Button */}
            <Pressable 
              onPress={() => handlePressTeam(item.id)}
              style={({ pressed }) => [
                styles.tertiaryButton,
                pressed && styles.buttonPressed
              ]}
            >
              <Text style={styles.buttonLabel}>VIEW TEAM</Text>
            </Pressable>
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
  bannerContainer: {
    height: 160,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 54, 100, 0.08)', // light pink/purple tint matching tertiary-dim/10
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  groupIcon: {
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  overlaidTitle: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -0.5,
  },
  detailsContainer: {
    padding: 20,
    alignItems: 'stretch',
  },
  description: {
    fontSize: 14,
    color: '#64547d', // on-surface-variant
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 20,
    fontFamily: 'Manrope_500Medium',
  },
  boldTertiary: {
    color: '#6346cd', // primary purple color token
    fontFamily: 'Outfit_800ExtraBold',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffeff2', // on-tertiary
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#9b3664', // tertiary
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#9b3664',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tertiaryButton: {
    width: '100%',
    backgroundColor: '#9b3664', // tertiary color token
    borderRadius: 12, // rounded-lg matching the HTML spec
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9b3664',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  buttonLabel: {
    color: '#ffeff2', // on-tertiary
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
    backgroundColor: '#9b3664', // tertiary
  },
  inactiveDot: {
    backgroundColor: '#ffeff2', // on-tertiary
  },
});

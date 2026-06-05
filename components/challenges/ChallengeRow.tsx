import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Challenge } from '../../types/challenges';

interface ChallengeRowProps {
  item: Challenge;
  pointsColor?: 'primary' | 'tertiary'; // deprecated but kept for backward compatibility
}

export default function ChallengeRow({ item }: ChallengeRowProps) {
  const handlePressRow = () => {
    router.push(`/challenge/${item.id}`);
  };

  const getIconConfig = (id: string) => {
    if (id.includes('gor-gai')) {
      return {
        name: 'local-cafe' as const,
        color: '#6346cd', // primary
        bgColor: 'rgba(99, 70, 205, 0.1)', // primary/10
      };
    }
    if (id.includes('group-feast')) {
      return {
        name: 'group' as const,
        color: '#6e45ac', // secondary
        bgColor: 'rgba(110, 69, 172, 0.1)', // secondary/10
      };
    }
    if (id.includes('sushi')) {
      return {
        name: 'restaurant' as const,
        color: '#9b3664', // tertiary
        bgColor: 'rgba(155, 54, 100, 0.1)', // tertiary/10
      };
    }
    if (id.includes('late-night')) {
      return {
        name: 'schedule' as const,
        color: '#6346cd', // primary
        bgColor: 'rgba(99, 70, 205, 0.1)', // primary/10
      };
    }
    return {
      name: 'star' as const,
      color: '#6346cd',
      bgColor: 'rgba(99, 70, 205, 0.1)',
    };
  };

  const getGradientColors = (id: string): [string, string] => {
    if (id.includes('sushi')) {
      return ['#fcf4ff', '#ffeff2']; // surface to tertiary-container low opacity (pinkish)
    }
    return ['#fcf4ff', '#f8edff']; // surface to surface-container-low (purplish)
  };

  const getBorderColor = (id: string) => {
    if (id.includes('sushi')) {
      return 'rgba(155, 54, 100, 0.15)'; // tertiary outline-variant
    }
    return 'rgba(95, 57, 221, 0.15)'; // primary outline-variant
  };

  const getCountdownLabel = (endsAt: string) => {
    const difference = +new Date(endsAt) - +new Date();
    if (difference <= 0) return 'EXPIRED';
    const hours = difference / (1000 * 60 * 60);
    if (hours > 24) {
      return `ENDS IN ${Math.ceil(hours / 24)} DAYS`;
    } else if (hours > 1) {
      return `ENDS IN ${Math.ceil(hours)} HRS`;
    } else {
      const mins = difference / (1000 * 60);
      return `ENDS IN ${Math.ceil(mins)} MINS`;
    }
  };

  const iconConfig = getIconConfig(item.id);
  const gradientColors = getGradientColors(item.id);
  const borderColor = getBorderColor(item.id);

  return (
    <Pressable 
      onPress={handlePressRow}
      style={({ pressed }) => [
        styles.rowContainer,
        { borderColor },
        pressed && styles.pressed
      ]}
    >
      {/* Background Gradient matching the spec */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Left Icon Chip with themed background */}
      <View style={[styles.iconChip, { backgroundColor: iconConfig.bgColor }]}>
        <MaterialIcons 
          name={iconConfig.name} 
          size={22} 
          color={iconConfig.color} 
        />
      </View>

      {/* Middle Text Details */}
      <View style={styles.details}>
        <Text style={styles.countdownLabel}>
          {getCountdownLabel(item.endsAt)}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>

      {/* Right Points Badge (Text only matching the mockup screenshot) */}
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>
          {item.points} PTS
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16, // rounded-xl (not rounded-full) matching the HTML spec and screenshot
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#6346cd', // primary shadow tint
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  countdownLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#b41340', // text-error / ends-in highlighted color
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#36274d', // on-surface
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#64547d', // on-surface-variant
    marginTop: 1,
  },
  pointsBadge: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 70,
  },
  pointsText: {
    fontSize: 16, // slightly larger to pop out like in the mockup
    fontFamily: 'Outfit_800ExtraBold',
    color: '#6346cd', // consistent primary color for points
    letterSpacing: -0.5,
  },
});

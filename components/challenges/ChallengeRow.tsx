import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Challenge } from '../../types/challenges';

interface ChallengeRowProps {
  item: Challenge;
}

export default function ChallengeRow({ item }: ChallengeRowProps) {
  const handlePress = () => {
    router.push(`/challenge/${item.id}`);
  };

  /* ── Icon config per challenge id ──────────────── */
  const getIconConfig = (id: string) => {
    if (id.includes('gor-gai'))
      return {
        name: 'local-cafe' as const,
        color: '#5f39dd',
        bgColor: 'rgba(165, 144, 255, 0.20)',
      };
    if (id.includes('group-feast'))
      return {
        name: 'group' as const,
        color: '#6e45ac',
        bgColor: 'rgba(223, 200, 255, 0.20)',
      };
    if (id.includes('sushi'))
      return {
        name: 'restaurant' as const,
        color: '#9b3664',
        bgColor: 'rgba(255, 140, 186, 0.20)',
      };
    if (id.includes('late-night'))
      return {
        name: 'schedule' as const,
        color: '#5f39dd',
        bgColor: 'rgba(165, 144, 255, 0.20)',
      };
    return {
      name: 'star' as const,
      color: '#5f39dd',
      bgColor: 'rgba(165, 144, 255, 0.20)',
    };
  };

  /* ── Countdown label ───────────────────────────── */
  const getCountdownLabel = (endsAt: string) => {
    const diff = +new Date(endsAt) - +new Date();
    if (diff <= 0) return 'EXPIRED';
    const hrs = diff / (1000 * 60 * 60);
    if (hrs > 24) return `ENDS IN ${Math.ceil(hrs / 24)} DAYS`;
    if (hrs > 1) return `ENDS IN ${Math.ceil(hrs)} HRS`;
    return `ENDS IN ${Math.ceil(diff / (1000 * 60))} MINS`;
  };

  const icon = getIconConfig(item.id);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={styles.rowFrame}
    >
      <LinearGradient
        colors={['#ffffff', '#f8edff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.rowGradientContainer}
      >
        {/* Left: Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: icon.bgColor }]}>
          <MaterialIcons name={icon.name} size={24} color={icon.color} />
        </View>

        {/* Center: Text column */}
        <View style={styles.textCol}>
          <Text style={styles.countdown}>{getCountdownLabel(item.endsAt)}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </View>

        {/* Right: Points pill */}
        <View style={styles.pointsPill}>
          <Text style={styles.pointsText}>{item.points} PTS</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* ── Styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  rowFrame: {
    width: '100%',                        // stretch to full parent width
    borderRadius: 48,                     // matching rounded-xl (3rem = 48px)
    borderWidth: 1,
    borderColor: 'rgba(184, 165, 211, 0.35)', // slightly more defined outline
    marginBottom: 16,                     // gap-4
    // Drop shadow matching drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  rowGradientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,                          // p-[13px]
    width: '100%',
    borderRadius: 48,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  /* Icon */
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,                      // gap-[16px]
  },

  /* Text */
  textCol: {
    flex: 1,
    marginRight: 16,                      // spacing before badge
    justifyContent: 'center',
  },
  countdown: {
    fontSize: 9,                          // text-[9px]
    fontFamily: 'Manrope_800ExtraBold',   // font-black
    color: '#b41340',                     // error
    letterSpacing: 0.45,                  // tracking-[0.45px]
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,                         // text-[14px]
    fontFamily: 'Manrope_800ExtraBold',   // font-black
    color: '#36274d',                     // on-surface
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 11,                         // text-[11px]
    fontFamily: 'Manrope_500Medium',      // font-medium
    color: '#64547d',                     // on-surface-variant
    lineHeight: 16.5,
    marginTop: 1,
  },

  /* Points pill */
  pointsPill: {
    backgroundColor: '#5f39dd',           // primary
    borderRadius: 9999,                   // rounded-[9999px]
    paddingHorizontal: 16,                // px-[16px]
    paddingVertical: 6,                   // py-[6px]
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',                  // prevent stretching in any layout context
    // shadow-lg shadow-primary/30
    shadowColor: '#5f39dd',
    shadowOpacity: 0.30,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pointsText: {
    fontSize: 14,                         // text-[14px]
    fontFamily: 'Manrope_800ExtraBold',   // font-black
    color: '#f6f0ff',                     // on-primary
    letterSpacing: -0.7,                  // tracking-[-0.7px]
    textTransform: 'uppercase',
  },
});

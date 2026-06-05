import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#7c5afa', '#f37cad', '#a590ff', '#dfc8ff', '#9b3664'];
const NUM_CONFETTI = 45;

interface ConfettiPieceProps {
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

const ConfettiPiece = React.memo(({ x, color, size, delay, duration }: ConfettiPieceProps) => {
  const translateY = useSharedValue(-20);
  const rotateVal = useSharedValue(Math.random() * 360);
  const opacityVal = useSharedValue(0.6 + Math.random() * 0.4);

  useEffect(() => {
    // Animate falling top -> bottom on a loop
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 20, {
          duration,
          easing: Easing.linear,
        }),
        -1, // loop indefinitely
        false // reset to top instead of reversing
      )
    );

    // Animate rotation continuously on a loop
    rotateVal.value = withRepeat(
      withTiming(rotateVal.value + 360, {
        duration: 1500 + Math.random() * 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotateVal.value}deg` },
      ],
      opacity: opacityVal.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: x,
          width: size,
          height: size,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
});

ConfettiPiece.displayName = 'ConfettiPiece';

export default function Confetti() {
  useEffect(() => {
    // Trigger success haptics once on mount
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Haptics failed to trigger:', e);
    }
  }, []);

  // Generate confetti items once on mount
  const pieces = useMemo(() => {
    const list = [];
    for (let i = 0; i < NUM_CONFETTI; i++) {
      const x = Math.random() * SCREEN_WIDTH;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const size = 4 + Math.random() * 8; // 4px to 12px
      const delay = Math.random() * 2000; // staggered delay up to 2s
      const duration = 2000 + Math.random() * 1500; // 2s to 3.5s fall duration
      list.push({ id: i, x, color, size, delay, duration });
    }
    return list;
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <ConfettiPiece
          key={p.id}
          x={p.x}
          color={p.color}
          size={p.size}
          delay={p.delay}
          duration={p.duration}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 2,
    pointerEvents: 'none',
    zIndex: 5,
  },
});

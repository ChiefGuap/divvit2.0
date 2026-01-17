import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Loading your next bill split..."
}) => {
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, {
                duration: 1500,
                easing: Easing.linear,
            }),
            -1 // Infinite repeat
        );
        return () => {
            cancelAnimation(rotation);
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotateZ: `${rotation.value}deg` }],
        };
    });

    return (
        <View style={styles.container}>
            {/* Background Gradient - Solid Purple / Blurple aesthetic */}
            {/* Using a solid color close to the image reference, or a subtle gradient */}
            <LinearGradient
                colors={['#5B3FD9', '#4c35b5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <BlurView intensity={0} tint="dark" style={StyleSheet.absoluteFill} />

            <View style={styles.contentContainer}>
                {/* Animated Loading Circle with SVG Gradient */}
                <Animated.View style={[styles.circleContainer, animatedStyle]}>
                    <Svg height="80" width="80" viewBox="0 0 100 100">
                        <Defs>
                            <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.1" />
                            </SvgGradient>
                        </Defs>
                        <Circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="url(#grad)"
                            strokeWidth="4"
                            fill="transparent"
                            strokeLinecap="round"
                        />
                    </Svg>
                </Animated.View>

                {/* Text */}
                <Text style={styles.text}>{message}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999, // Ensure it's on top
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        marginTop: 32,
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'System',
        opacity: 0.9,
    },
});

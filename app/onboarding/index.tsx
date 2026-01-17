import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    FlatList,
    ViewToken,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Home, Camera, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Slide data
const slides = [
    {
        id: '1',
        title: 'Create & Join',
        description: 'Start a bill or join with a link. Splitting has never been easier.',
        icon: Home,
        color: '#B54CFF',
        gradient: ['#B54CFF', '#8B5CF6'],
    },
    {
        id: '2',
        title: 'Split & Scan',
        description: 'Scan receipts instantly or enter items manually. AI does the math.',
        icon: Camera,
        color: '#22C55E',
        gradient: ['#22C55E', '#16A34A'],
    },
    {
        id: '3',
        title: 'Earn Rewards',
        description: 'Get points for every split. Redeem for exclusive perks and deals.',
        icon: Sparkles,
        color: '#F59E0B',
        gradient: ['#F59E0B', '#D97706'],
    },
];

// Individual slide component
const SlideItem = ({ item, index, scrollX }: { item: typeof slides[0]; index: number; scrollX: Animated.SharedValue<number> }) => {
    const Icon = item.icon;

    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const scale = interpolate(
            scrollX.value,
            inputRange,
            [0.8, 1, 0.8],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.5, 1, 0.5],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale }],
            opacity,
        };
    });

    return (
        <View style={{ width: SCREEN_WIDTH }} className="items-center justify-center px-8">
            <Animated.View
                style={[animatedStyle]}
                className="items-center"
            >
                {/* Icon Container */}
                <View
                    className="w-32 h-32 rounded-full items-center justify-center mb-8"
                    style={{
                        backgroundColor: `${item.color}20`,
                        shadowColor: item.color,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    <View
                        className="w-24 h-24 rounded-full items-center justify-center"
                        style={{ backgroundColor: item.color }}
                    >
                        <Icon size={48} color="#FFFFFF" strokeWidth={2} />
                    </View>
                </View>

                {/* Title */}
                <Text className="text-3xl font-heading font-bold text-divvit-text text-center mb-4">
                    {item.title}
                </Text>

                {/* Description */}
                <Text className="text-base font-body text-divvit-muted text-center leading-6 px-4">
                    {item.description}
                </Text>
            </Animated.View>
        </View>
    );
};

// Pagination dot component
const PaginationDot = ({ index, scrollX }: { index: number; scrollX: Animated.SharedValue<number> }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const width = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
        );

        return {
            width,
            opacity,
        };
    });

    return (
        <Animated.View
            style={[animatedStyle]}
            className="h-2 rounded-full bg-divvit-secondary mx-1"
        />
    );
};

export default function TutorialScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const handleGetStarted = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/onboarding/personal-info');
    };

    const handleNext = async () => {
        await Haptics.selectionAsync();
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        }
    };

    const handleSkip = async () => {
        await Haptics.selectionAsync();
        flatListRef.current?.scrollToIndex({
            index: slides.length - 1,
            animated: true,
        });
    };

    const isLastSlide = currentIndex === slides.length - 1;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Skip Button */}
            {!isLastSlide && (
                <TouchableOpacity
                    onPress={handleSkip}
                    className="absolute top-16 right-6 z-10 py-2 px-4"
                    activeOpacity={0.7}
                >
                    <Text className="text-divvit-muted font-body text-base">Skip</Text>
                </TouchableOpacity>
            )}

            {/* Carousel */}
            <View className="flex-1 justify-center">
                <FlatList
                    ref={flatListRef}
                    data={slides}
                    renderItem={({ item, index }) => (
                        <SlideItem item={item} index={index} scrollX={scrollX} />
                    )}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={(event) => {
                        scrollX.value = event.nativeEvent.contentOffset.x;
                    }}
                    scrollEventThrottle={16}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                />
            </View>

            {/* Bottom Section */}
            <View className="px-6 pb-8">
                {/* Pagination */}
                <View className="flex-row justify-center items-center mb-8">
                    {slides.map((_, index) => (
                        <PaginationDot key={index} index={index} scrollX={scrollX} />
                    ))}
                </View>

                {/* Action Button */}
                {isLastSlide ? (
                    <TouchableOpacity
                        onPress={handleGetStarted}
                        className="bg-divvit-secondary h-14 rounded-2xl items-center justify-center"
                        style={{
                            shadowColor: '#B54CFF',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-lg">Get Started</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleNext}
                        className="bg-divvit-card h-14 rounded-2xl items-center justify-center border border-gray-200"
                        activeOpacity={0.8}
                    >
                        <Text className="text-divvit-text font-bold text-lg">Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

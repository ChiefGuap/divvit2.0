import React, { useState } from 'react';
import { View, Text, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

// --- Types ---
type DigitalReceiptProps = {
    date: string;
    total: number;
    items: Array<{ name: string; price: number }>;
    storeName?: string;
    tax?: number;
    tip?: number;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH * 0.75;
export const CARD_HEIGHT = SCREEN_HEIGHT * 0.55; // 55% of screen height

// --- Zigzag Bottom Edge Component ---
const ZigzagEdge = ({ width }: { width: number }) => {
    const zigzagWidth = 12;
    const zigzagHeight = 8;
    const count = Math.ceil(width / zigzagWidth);

    let pathD = `M 0 0`;
    for (let i = 0; i < count; i++) {
        const x1 = i * zigzagWidth + zigzagWidth / 2;
        const x2 = (i + 1) * zigzagWidth;
        pathD += ` L ${x1} ${zigzagHeight} L ${x2} 0`;
    }
    pathD += ` L ${width} ${zigzagHeight + 5} L 0 ${zigzagHeight + 5} Z`;

    return (
        <Svg width={width} height={zigzagHeight + 5} style={{ marginTop: -1 }}>
            <Path d={pathD} fill="#F5F5F0" />
        </Svg>
    );
};

// --- Fade Gradient Overlay ---
const FadeGradient = ({ width }: { width: number }) => (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, pointerEvents: 'none' }}>
        <Svg width={width} height={40}>
            <Defs>
                <LinearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#F5F5F0" stopOpacity="0" />
                    <Stop offset="1" stopColor="#F5F5F0" stopOpacity="1" />
                </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={40} fill="url(#fadeGrad)" />
        </Svg>
    </View>
);

// --- Format Date ---
const formatReceiptDate = (dateString: string): { date: string; time: string } => {
    const d = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const date = `${months[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}, ${d.getFullYear()}`;
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const time = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    return { date, time };
};

// --- Main Component ---
export const DigitalReceipt = ({ date, total, items, storeName = 'DIVVIT', tax = 0, tip = 0 }: DigitalReceiptProps) => {
    const { date: formattedDate, time } = formatReceiptDate(date);
    const [showFadeGradient, setShowFadeGradient] = useState(true);

    // Check if we've scrolled to the bottom
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
        setShowFadeGradient(!isAtBottom);
    };

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);

    return (
        <View
            style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                marginHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - 10,
            }}
        >
            {/* Receipt Body */}
            <View
                style={{
                    flex: 1,
                    backgroundColor: '#F5F5F0',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                    elevation: 10,
                    overflow: 'hidden',
                }}
            >
                {/* Internal ScrollView with nestedScrollEnabled */}
                <ScrollView
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingTop: 24,
                        paddingBottom: 30,
                    }}
                >
                    {/* Store Name / Header */}
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <Text
                            style={{
                                fontFamily: 'Courier',
                                fontSize: 20,
                                fontWeight: 'bold',
                                letterSpacing: 4,
                                color: '#1A1A1A',
                            }}
                        >
                            {storeName}
                        </Text>
                        <View
                            style={{
                                width: '60%',
                                height: 1,
                                backgroundColor: '#CCCCCC',
                                marginTop: 8,
                            }}
                        />
                    </View>

                    {/* Date & Time */}
                    <View style={{ marginBottom: 16 }}>
                        <Text
                            style={{
                                fontFamily: 'Courier',
                                fontSize: 11,
                                color: '#666666',
                                textAlign: 'center',
                            }}
                        >
                            {formattedDate}
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Courier',
                                fontSize: 11,
                                color: '#666666',
                                textAlign: 'center',
                            }}
                        >
                            {time}
                        </Text>
                    </View>

                    {/* Dashed Separator */}
                    <Text
                        style={{
                            fontFamily: 'Courier',
                            fontSize: 10,
                            color: '#AAAAAA',
                            textAlign: 'center',
                            letterSpacing: 2,
                            marginBottom: 12,
                        }}
                    >
                        - - - - - - - - - - - - - - -
                    </Text>

                    {/* All Items - Full List */}
                    <View style={{ marginBottom: 16 }}>
                        <Text
                            style={{
                                fontFamily: 'Courier',
                                fontSize: 10,
                                color: '#888888',
                                marginBottom: 8,
                            }}
                        >
                            ITEMS ({items.length})
                        </Text>
                        {items.map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: 'Courier',
                                        fontSize: 12,
                                        color: '#333333',
                                        flex: 1,
                                        marginRight: 8,
                                    }}
                                    numberOfLines={1}
                                >
                                    {item.name}
                                </Text>
                                <Text
                                    style={{
                                        fontFamily: 'Courier',
                                        fontSize: 12,
                                        color: '#333333',
                                    }}
                                >
                                    ${item.price.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Dashed Separator */}
                    <Text
                        style={{
                            fontFamily: 'Courier',
                            fontSize: 10,
                            color: '#AAAAAA',
                            textAlign: 'center',
                            letterSpacing: 2,
                            marginBottom: 12,
                        }}
                    >
                        - - - - - - - - - - - - - - -
                    </Text>

                    {/* Subtotal, Tax, Tip */}
                    <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#666666' }}>
                                Subtotal
                            </Text>
                            <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#666666' }}>
                                ${subtotal.toFixed(2)}
                            </Text>
                        </View>
                        {tax > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#666666' }}>
                                    Tax
                                </Text>
                                <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#666666' }}>
                                    ${tax.toFixed(2)}
                                </Text>
                            </View>
                        )}
                        {tip > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#666666' }}>
                                    Tip
                                </Text>
                                <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#666666' }}>
                                    ${tip.toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Total */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: '#DDDDDD',
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: 'Courier',
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: '#1A1A1A',
                            }}
                        >
                            TOTAL
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Courier',
                                fontSize: 24,
                                fontWeight: 'bold',
                                color: '#1A1A1A',
                            }}
                        >
                            ${total.toFixed(2)}
                        </Text>
                    </View>

                    {/* Thank You */}
                    <Text
                        style={{
                            fontFamily: 'Courier',
                            fontSize: 10,
                            color: '#888888',
                            textAlign: 'center',
                            marginTop: 16,
                            letterSpacing: 1,
                        }}
                    >
                        THANK YOU FOR SPLITTING!
                    </Text>
                </ScrollView>

                {/* Fade Gradient at bottom when more content exists */}
                {showFadeGradient && items.length > 4 && (
                    <FadeGradient width={CARD_WIDTH - 2} />
                )}
            </View>

            {/* Zigzag Torn Paper Edge */}
            <ZigzagEdge width={CARD_WIDTH} />
        </View>
    );
};

export default DigitalReceipt;

import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { Participant, PaymentRequest } from '../../types';
import * as Haptics from 'expo-haptics';

// Design system colors matching Indigo Velvet style
const COLORS = {
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f8edff',
    surfaceVariant: '#e8d5ff',
    onSurface: '#36274d',
    onSurfaceVariant: '#64547d',
    primary: '#5f39dd',
    outlineVariant: 'rgba(184, 165, 211, 0.2)',
};

interface ScalePressableProps {
    onPress?: () => void;
    style?: any;
    children: React.ReactNode;
    disabled?: boolean;
}

const ScalePressable: React.FC<ScalePressableProps> = ({ onPress, style, children, disabled }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
        if (disabled) return;
        Animated.spring(scaleValue, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 0,
        }).start();
    };

    const onPressOut = () => {
        if (disabled) return;
        Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 0,
        }).start();
    };

    const handlePress = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
    };

    return (
        <TouchableWithoutFeedback
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={handlePress}
            disabled={disabled}
        >
            <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

interface PaymentRequestSheetProps {
    visible: boolean;
    participant: Participant | null;
    amount: number;
    request: PaymentRequest | null;
    onClose: () => void;
    onVenmo: () => void;
    onCashApp: () => void;
    onZelle: () => void;
    onMarkAsReceived?: () => void;
    onSettleOutsideApp?: () => void;
}

export default function PaymentRequestSheet({
    visible,
    participant,
    amount,
    request,
    onClose,
    onVenmo,
    onCashApp,
    onZelle,
    onMarkAsReceived,
    onSettleOutsideApp,
}: PaymentRequestSheetProps) {
    const insets = useSafeAreaInsets();

    if (!participant) return null;

    const hasActiveRequest = !!request && request.status !== 'confirmed';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop Blur */}
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                
                {/* Clickable Backdrop overlay to close */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdropTouch} />
                </TouchableWithoutFeedback>

                {/* Bottom Sheet Container */}
                <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.participantName}>{participant.name}</Text>
                        <Text style={styles.oweText}>
                            Owes <Text style={styles.oweAmount}>${amount.toFixed(2)}</Text>
                        </Text>
                    </View>

                    {/* Scrollable actions container */}
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* 2x2 Bento Grid */}
                        <View style={styles.gridContainer}>
                            <View style={styles.gridRow}>
                                {/* Venmo Button */}
                                <ScalePressable
                                    style={styles.bentoButton}
                                    onPress={onVenmo}
                                >
                                    <View style={styles.iconCircle}>
                                        <MaterialIcons name="account-balance-wallet" size={36} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.bentoLabel}>Venmo</Text>
                                </ScalePressable>

                                {/* Cash App Button */}
                                <ScalePressable
                                    style={styles.bentoButton}
                                    onPress={onCashApp}
                                >
                                    <View style={styles.iconCircle}>
                                        <MaterialIcons name="attach-money" size={36} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.bentoLabel}>Cash App</Text>
                                </ScalePressable>
                            </View>

                            <View style={styles.gridRow}>
                                {/* Zelle Button */}
                                <ScalePressable
                                    style={styles.bentoButton}
                                    onPress={onZelle}
                                >
                                    <View style={styles.iconCircle}>
                                        <MaterialIcons name="account-balance" size={36} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.bentoLabel}>Zelle</Text>
                                </ScalePressable>

                                {/* Tap-To-Pay (Soon) */}
                                <View style={[styles.bentoButton, styles.disabledBento]}>
                                    <View style={styles.iconCircle}>
                                        <MaterialIcons name="contactless" size={36} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.disabledLabelContainer}>
                                        <Text style={styles.bentoLabel}>Tap-To-Pay</Text>
                                        <Text style={styles.soonLabel}>SOON</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Secondary Actions Stack */}
                        <View style={styles.secondaryActions}>
                            {hasActiveRequest && onMarkAsReceived && (
                                <ScalePressable
                                    style={styles.secondaryButton}
                                    onPress={onMarkAsReceived}
                                >
                                    <Text style={styles.secondaryButtonText}>Mark as Received</Text>
                                </ScalePressable>
                            )}

                            {hasActiveRequest && onSettleOutsideApp && (
                                <ScalePressable
                                    style={styles.secondaryButton}
                                    onPress={onSettleOutsideApp}
                                >
                                    <Text style={styles.secondaryButtonText}>Settle Outside App</Text>
                                </ScalePressable>
                            )}

                            <ScalePressable
                                style={styles.cancelButton}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </ScalePressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(54, 39, 77, 0.6)',
    },
    sheet: {
        backgroundColor: COLORS.surfaceContainerLowest,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 16,
        paddingHorizontal: 24,
        maxHeight: '90%',
        shadowColor: '#7c5afa',
        shadowOpacity: 0.10,
        shadowRadius: 50,
        shadowOffset: { width: 0, height: -20 },
        elevation: 24,
    },
    handle: {
        width: 48,
        height: 6,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    participantName: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 24,
        color: COLORS.onSurface,
        marginBottom: 4,
    },
    oweText: {
        fontFamily: 'Manrope_500Medium',
        fontSize: 16,
        color: COLORS.onSurfaceVariant,
    },
    oweAmount: {
        fontFamily: 'Outfit_700Bold',
        color: COLORS.onSurface,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    gridContainer: {
        gap: 16,
        marginBottom: 8,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 16,
    },
    bentoButton: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: COLORS.surfaceContainerLowest,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    disabledBento: {
        opacity: 0.5,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    bentoLabel: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: COLORS.onSurface,
        textAlign: 'center',
    },
    disabledLabelContainer: {
        alignItems: 'center',
    },
    soonLabel: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 11,
        color: COLORS.primary,
        letterSpacing: 1,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.surfaceVariant,
        width: '100%',
        marginVertical: 16,
    },
    secondaryActions: {
        gap: 12,
    },
    secondaryButton: {
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: COLORS.primary,
    },
    cancelButton: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    cancelButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: COLORS.onSurface,
    },
});

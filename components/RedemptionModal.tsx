import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Tag, Lock, AlertTriangle, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRewards } from '../context/RewardsContext';

// DESIGN SYSTEM
const COLORS = {
  primary: '#6346cd',
  primaryDim: '#4b29b4',
  surface: '#f9f9ff',
  surfaceContainer: '#f1f3ff',
  surfaceContainerLow: '#f1f3ff',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#111827',
  onSurfaceVariant: '#484554',
  secondary: '#484554',
  outline: '#9ca3af',
  outlineVariant: '#e5e7eb',
  error: '#dc2626',
  success: '#16a34a',
};

interface RewardItem {
  id: string;
  name: string;
  description?: string;
  points_required: number;
  reward_type?: string;
  reward_value?: string;
  vendor?: string;
  image_url?: string;
}

interface RedemptionModalProps {
  visible: boolean;
  reward: RewardItem | null;
  userPoints: number;
  onClose: () => void;
  onRedeemed: () => void;
}

export default function RedemptionModal({
  visible,
  reward,
  userPoints,
  onClose,
  onRedeemed,
}: RedemptionModalProps) {
  const { user } = useAuth();
  const rewards = useRewards();
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Reset state when modal opens with a new reward
  useEffect(() => {
    if (visible) {
      setIsRedeemed(false);
      setIsRedeeming(false);
    }
  }, [visible, reward?.id]);

  if (!reward) return null;

  const hasEnoughPoints = userPoints >= reward.points_required;
  const pointsNeeded = reward.points_required - userPoints;

  const handleRedeem = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Confirm Redemption',
      `Spend ${reward.points_required} pts to unlock your ${reward.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Redeem!',
          onPress: async () => {
            try {
              setIsRedeeming(true);

              const { data: newBalance, error } = await supabase.rpc('award_points', {
                p_user_id: user.id,
                p_points: -(reward.points_required),
                p_event_type: 'redemption',
                p_description: `Redeemed: ${reward.name}`,
              });

              if (error) throw error;

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              if (typeof newBalance === 'number') {
                rewards.setPointsOptimistic(newBalance);
              }

              setIsRedeemed(true);
              onRedeemed();
            } catch (err: any) {
              console.error('[RedemptionModal] Redemption error:', err);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Could not redeem. Try again.');
            } finally {
              setIsRedeeming(false);
            }
          },
        },
      ]
    );
  };

  // ─── Expiry date for redeemed rewards ───
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryString = expiryDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // ─── Render STATE 1: Not Enough Points ───
  const renderNotEnoughPoints = () => (
    <>
      {/* Reward Icon */}
      <View style={s.rewardCircle}>
        {reward.image_url ? (
          <Image source={{ uri: reward.image_url }} style={s.rewardImage} resizeMode="cover" />
        ) : (
          <Tag size={36} color={COLORS.primary} />
        )}
      </View>

      {/* Reward Name */}
      <Text style={s.rewardName}>{reward.name}</Text>

      {/* Warning Banner */}
      <View style={s.warningBanner}>
        <AlertTriangle size={20} color="#d97706" />
        <Text style={s.warningText}>
          You need {pointsNeeded} more points to unlock this reward
        </Text>
      </View>

      {/* Disabled Button */}
      <TouchableOpacity
        style={[s.redeemButton, s.disabledButton]}
        disabled={true}
        activeOpacity={1}
      >
        <Text style={[s.redeemButtonText, s.disabledButtonText]}>NOT ENOUGH POINTS</Text>
      </TouchableOpacity>
    </>
  );

  // ─── Render STATE 2: Enough Points, Not Yet Redeemed ───
  const renderReadyToRedeem = () => (
    <>
      {/* Reward Icon */}
      <View style={s.rewardCircle}>
        {reward.image_url ? (
          <Image source={{ uri: reward.image_url }} style={s.rewardImage} resizeMode="cover" />
        ) : (
          <Tag size={36} color={COLORS.primary} />
        )}
      </View>

      {/* Reward Name */}
      <Text style={s.rewardName}>{reward.name}</Text>

      {/* Points Cost */}
      <View style={s.pointsCostRow}>
        <Star size={18} color={COLORS.primary} />
        <Text style={s.pointsCostText}>{reward.points_required} pts</Text>
      </View>

      {/* Locked QR Teaser */}
      <View style={s.lockedQrContainer}>
        <Lock size={40} color={COLORS.primary} />
        <Text style={s.lockedQrTitle}>QR Code Unlocks After Redemption</Text>
        <Text style={s.lockedQrSubtitle}>Your code will appear here</Text>
      </View>

      {/* Active Redeem Button */}
      <TouchableOpacity
        style={[s.redeemButton, isRedeeming && s.redeemingButton]}
        onPress={handleRedeem}
        disabled={isRedeeming}
        activeOpacity={0.8}
      >
        {isRedeeming ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={s.redeemButtonText}>
            REDEEM NOW — {reward.points_required} pts
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ─── Render STATE 3: Redeemed — QR Code Visible ───
  const renderRedeemed = () => (
    <>
      {/* Success Badge */}
      <View style={s.successBadge}>
        <Text style={s.successBadgeText}>✓ REDEEMED</Text>
      </View>

      {/* Reward Name */}
      <Text style={s.rewardName}>{reward.name}</Text>

      {/* QR Code (now visible) */}
      <View style={s.qrContainer}>
        <QRCode
          value={`divvit://reward/${reward.id}`}
          size={180}
          color={COLORS.onSurface}
          backgroundColor="transparent"
        />
        <Text style={s.qrValidText}>Valid for 30 days after activation.</Text>
        <Text style={s.qrExpiryText}>Expires: {expiryString}</Text>
      </View>

      {/* Show at Register Instruction */}
      <View style={s.registerBanner}>
        <Text style={s.registerBannerText}>📱 Show this QR code at the register</Text>
      </View>

      {/* Done Button */}
      <TouchableOpacity
        style={s.redeemButton}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Text style={s.redeemButtonText}>Done</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <Text style={s.redemptionLabel}>
            {isRedeemed ? 'REDEEMED' : 'REDEMPTION'}
          </Text>
          <TouchableOpacity style={s.closeButton} onPress={onClose} activeOpacity={0.7}>
            <X size={24} color={COLORS.outline} />
          </TouchableOpacity>

          {/* Conditional state rendering */}
          {!hasEnoughPoints && !isRedeemed
            ? renderNotEnoughPoints()
            : !isRedeemed
              ? renderReadyToRedeem()
              : renderRedeemed()}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 28,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 24,
  },
  redemptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  rewardImage: {
    width: '100%',
    height: '100%',
  },
  rewardName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.onSurface,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  // ─── STATE 1: Not Enough Points ───
  warningBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },

  // ─── STATE 2: Ready to Redeem ───
  pointsCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    marginTop: -8,
  },
  pointsCostText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  lockedQrContainer: {
    backgroundColor: '#f1f3ff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  lockedQrTitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  lockedQrSubtitle: {
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 4,
    textAlign: 'center',
  },

  // ─── STATE 3: Redeemed ───
  successBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  qrContainer: {
    backgroundColor: '#f1f3ff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  qrValidText: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
  },
  qrExpiryText: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 4,
    textAlign: 'center',
  },
  registerBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    width: '100%',
  },
  registerBannerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ─── Buttons ───
  redeemButton: {
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  redeemingButton: {
    opacity: 0.8,
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  redeemButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

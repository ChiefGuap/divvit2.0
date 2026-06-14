import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  style?: any;
  labelStyle?: any;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export default function PrimaryButton({
  label,
  onPress,
  iconName,
  style,
  labelStyle,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        isSecondary ? styles.secondaryButton : {},
        disabled ? styles.disabled : {},
        style || {},
      ]}
    >
      <View style={styles.content}>
        {iconName && (
          <MaterialIcons
            name={iconName}
            size={20}
            color={isSecondary ? '#6346cd' : '#f6f0ff'}
            style={styles.icon}
          />
        )}
        <Text style={[styles.labelText, isSecondary && styles.secondaryLabelText, labelStyle]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: '#6346cd', // primary brand purple
    borderRadius: 32, // rounded-lg matching Figma (2rem = 32px)
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Signature Glow Shadow
    shadowColor: '#6346cd',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  labelText: {
    color: '#f6f0ff', // on-primary
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  secondaryLabelText: {
    color: '#6346cd', // primary brand purple color
  },
});

import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  style?: any;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export default function PrimaryButton({
  label,
  onPress,
  iconName,
  style,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
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
        <Text style={[styles.labelText, isSecondary && styles.secondaryLabelText]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: '#6346cd', // primary color token
    borderRadius: 12, // rounded-lg matching the HTML spec
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
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
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

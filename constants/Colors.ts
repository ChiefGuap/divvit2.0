export const Colors = {
  primary: '#6346cd',
  primaryDark: '#4b29b4',
  white: '#ffffff',
  black: '#111827',

  surface: '#f9f9ff',
  surfaceCard: '#ffffff',
  surfaceSubtle: '#f1f3ff',

  textPrimary: '#111827',
  textSecondary: '#484554',
  textPlaceholder: '#9ca3af',

  border: '#e5e7eb',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',

  gradientStart: '#6346cd',
  gradientEnd: '#4b29b4',
} as const;

export const Typography = {
  fontFamily: 'Outfit_400Regular',
  fontFamilyMedium: 'Outfit_500Medium',
  fontFamilyBold: 'Outfit_700Bold',
} as const;

// Legacy default export retained for any straggling imports of the old
// Expo-template shape. New code should import { Colors, Typography }.
const tint = Colors.primary;
export default {
  light: {
    text: Colors.textPrimary,
    background: Colors.surface,
    tint,
    tabIconDefault: Colors.textPlaceholder,
    tabIconSelected: tint,
  },
  dark: {
    text: Colors.textPrimary,
    background: Colors.surface,
    tint,
    tabIconDefault: Colors.textPlaceholder,
    tabIconSelected: tint,
  },
};

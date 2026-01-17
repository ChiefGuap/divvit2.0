const tintColorLight = '#B54CFF'; // Divvit Primary (Purple for light theme)
const tintColorDark = '#B54CFF';

const divvitColors = {
  dark: '#FFFFFF',        // Pure White (was #0A0A0A) 
  card: '#F3F4F6',        // Very Light Gray (was #161616)
  primary: '#B54CFF',     // Brand Purple
  secondary: '#B54CFF',   // Brand Purple
  text: '#111827',        // Dark Gray (was #FFFFFF)
  muted: '#6B7280',       // Medium Gray (was #888888)
  border: '#E5E7EB',      // Light gray border
};

export default {
  light: {
    text: '#111827',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#111827',
    background: '#FFFFFF',
    tint: tintColorDark,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
  },
};

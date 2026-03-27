/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                divvit: {
                    dark: '#FFFFFF',       // Pure White (was #0A0A0A)
                    card: '#F3F4F6',        // Very Light Gray (was #161616)
                    primary: '#B54CFF',     // Brand Purple (was Neon Lime)
                    secondary: '#B54CFF',   // Brand Purple
                    text: '#111827',        // Dark Gray/Almost Black (was #FFFFFF)
                    muted: '#6B7280',       // Medium Gray (was #888888)
                    'stat-bg': '#EDE9FE',   // Light purple for stat cards
                    'input-bg': '#F9FAFB',  // Input background
                    'input-border': '#E5E7EB', // Input border
                },
                "surface": "#f9f9ff",
                "on-surface": "#141b2b",
                "on-surface-variant": "#484554",
                "surface-container-low": "#f1f3ff",
                "surface-container-highest": "#dce2f7",
                "surface-container": "#e9edff",
                "surface-container-lowest": "#ffffff",
                "primary": "#4b29b4",
                "on-primary": "#ffffff",
                "primary-container": "#6346cd",
                "error": "#ba1a1a",
                "on-primary-fixed-variant": "#4a28b3",
                "surface-container-high": "#e1e8fd",
                "surface-container-highest": "#dce2f7",
                "background": "#f9f9ff",
                "on-background": "#141b2b",
                "on-surface-variant": "#484554",
                "primary-fixed": "#e6deff",
                "secondary-fixed": "#e6deff",
                "secondary-fixed-dim": "#cbbefc",
                "on-secondary-fixed-variant": "#493f73",
                "on-secondary-fixed": "#1d1245",
                "secondary": "#61578d",
                "on-secondary": "#ffffff",
                "secondary-container": "#cec1ff",
                "on-secondary-container": "#574d82",
                "inverse-surface": "#293040",
                "inverse-primary": "#cbbeff",
                "surface-tint": "#6245cc",
                "on-primary-container": "#ded4ff",
                "surface-variant": "#dce2f7",
                "surface-dim": "#d3daef",
                "surface-bright": "#f9f9ff",
                "inverse-on-surface": "#edf0ff",
                "outline": "#797585",
                "outline-variant": "#cac4d6",
                "on-error": "#ffffff",
                "error-container": "#ffdad6",
            },
            fontFamily: {
                heading: ['Outfit_700Bold'],
                body: ['Outfit_400Regular'],
                medium: ['Outfit_500Medium'],
            }
        },
    },
    plugins: [],
}

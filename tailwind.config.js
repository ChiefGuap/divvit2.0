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
                }
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

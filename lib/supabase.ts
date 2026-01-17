import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform, Linking } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables!', { supabaseUrl, supabaseAnonKey });
    console.error('Please ensure .env contains EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY and restart the server.');
}

// Custom storage adapter to handle SSR/Web/Native
const ExpoStorage = {
    getItem: (key: string) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return Promise.resolve(null);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return Promise.resolve();
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return Promise.resolve();
        }
        return AsyncStorage.removeItem(key);
    },
};

// Fallback to avoid crash on init, but calls will fail
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder';

export const supabase = createClient(url, key, {
    auth: {
        storage: ExpoStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // Enable automatic OAuth URL parsing
    },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});

// Handle deep links including OAuth callbacks
Linking.addEventListener('url', async ({ url }) => {
    console.log('Supabase: Incoming Deep Link:', url);

    // Check if this is an OAuth callback with tokens
    if (url.includes('#access_token=') || url.includes('?code=') || url.includes('auth/callback')) {
        console.log('Supabase: OAuth callback detected, extracting session...');
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Supabase: Session extraction error:', error);
            } else {
                console.log('Supabase: Session extracted:', !!data.session);
            }
        } catch (e) {
            console.error('Supabase: Error handling OAuth callback:', e);
        }
    }
});

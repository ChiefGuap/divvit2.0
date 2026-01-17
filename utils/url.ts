import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';

/**
 * Get the auth callback URL for OAuth flows.
 * 
 * This uses makeRedirectUri() from expo-auth-session which is specifically
 * designed for OAuth flows and handles edge cases better than Linking.createURL().
 * - Expo Go: exp://192.168.x.x:8081/--/auth/callback
 * - Production build: divvit://auth/callback
 */
export function getAuthCallbackUrl(): string {
    const redirectUrl = makeRedirectUri({
        scheme: 'divvit',
        path: 'auth/callback',
    });
    console.log('Detected Redirect URL:', redirectUrl);
    return redirectUrl;
}

/**
 * Get the base scheme for the app.
 * Used for deep link configuration.
 */
export function getAppScheme(): string {
    return 'divvit';
}

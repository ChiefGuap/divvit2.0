import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

/**
 * Get the current app scheme from expo config.
 * Handles cases where scheme could be string or string[].
 * Returns 'divvit-dev' for development builds, 'divvit' for production.
 */
function getCurrentScheme(): string {
    const scheme = Constants.expoConfig?.scheme;
    if (Array.isArray(scheme)) {
        return scheme[0] ?? 'divvit';
    }
    return scheme ?? 'divvit';
}

/**
 * Get the auth callback URL for OAuth flows.
 * 
 * This uses makeRedirectUri() from expo-auth-session which is specifically
 * designed for OAuth flows and handles edge cases better than Linking.createURL().
 * - Expo Go: exp://192.168.x.x:8081/--/auth/callback
 * - Production build: divvit://auth/callback
 * - Dev build: divvit-dev://auth/callback
 */
export function getAuthCallbackUrl(): string {
    const scheme = getCurrentScheme();
    const redirectUrl = makeRedirectUri({
        scheme,
        path: 'auth/callback',
    });
    console.log('Detected Redirect URL:', redirectUrl);
    return redirectUrl;
}

/**
 * Get the base scheme for the app.
 * Used for deep link configuration.
 * Returns 'divvit-dev' for development builds, 'divvit' for production.
 */
export function getAppScheme(): string {
    return getCurrentScheme();
}

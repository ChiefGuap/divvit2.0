import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

/**
 * Root route redirect handler.
 * 
 * This file exists because Expo Router needs an index.tsx at the app root.
 * Instead of rendering content here, we redirect to the appropriate screen
 * based on auth state.
 */
export default function RootRedirect() {
    const { isLoading, session, hasProfile } = useAuth();

    // Wait for auth to complete before deciding where to go
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                <ActivityIndicator size="large" color="#B54CFF" />
            </View>
        );
    }

    // No session → login
    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    // No profile → setup
    if (!hasProfile) {
        return <Redirect href="/(auth)/setup" />;
    }

    // Has session + profile → tabs
    return <Redirect href="/(tabs)" />;
}

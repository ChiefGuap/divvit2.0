import "../global.css";
import { Slot, useRouter, useSegments } from "expo-router";
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect, useCallback, useRef } from "react";
import { View, ActivityIndicator, Linking, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getInitials, getNextColor } from "../types";
import { supabase } from "../lib/supabase";

// Loading screen component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color="#B54CFF" />
    </View>
  );
}

// Deep link handler component
function DeepLinkHandler() {
  const { session, user, profile, isLoading } = useAuth();
  const router = useRouter();
  const processingRef = useRef(false);

  const handleDeepLink = useCallback(async (url: string) => {
    // Prevent multiple simultaneous processing
    if (processingRef.current) return;

    console.log('DeepLink: Processing URL:', url);

    // Handle OAuth callback - extract tokens from URL
    // Supabase returns tokens in URL fragment (hash) or as code parameter
    if (url.includes('auth/callback') || url.includes('#access_token=') || url.includes('?code=')) {
      console.log('DeepLink: OAuth callback detected');
      console.log('DeepLink: Full URL:', url);
      processingRef.current = true;
      try {
        // Try to extract tokens from URL fragment (hash)
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hashParams = url.substring(hashIndex + 1);
          const params = new URLSearchParams(hashParams);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('DeepLink: Tokens found in URL, setting session manually');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.error('DeepLink: setSession error:', error);
            } else {
              console.log('DeepLink: Session set successfully');
            }
            processingRef.current = false;
            return; // Session set, onAuthStateChange will handle the rest
          }
        }

        // Fallback: let Supabase try to extract from URL automatically
        console.log('DeepLink: No tokens in fragment, trying getSession fallback');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('OAuth callback error:', error);
        } else {
          console.log('DeepLink: OAuth session retrieved:', !!data.session);
        }
      } catch (e) {
        console.error('OAuth extraction error:', e);
      } finally {
        processingRef.current = false;
      }
      return;
    }

    // Parse bill/[id] from various URL formats:
    // - divvit://bill/UUID
    // - divvit:///bill/UUID  
    // - exp://192.168.x.x:8081/--/bill/UUID
    const billMatch = url.match(/\/bill\/([a-f0-9-]+)/i);
    if (!billMatch) {
      console.log('DeepLink: Not a bill link, ignoring. URL:', url);
      return;
    }

    const billId = billMatch[1];
    console.log('DeepLink: Bill ID extracted:', billId);

    // Wait for auth to complete
    if (isLoading) {
      console.log('DeepLink: Auth still loading, waiting...');
      return;
    }

    // Must be authenticated
    if (!session || !user) {
      console.log('DeepLink: No session, redirecting to login first');
      // Store the deep link for after login (would need AsyncStorage for persistence)
      Alert.alert('Please Log In', 'Sign in to join this bill split.');
      return;
    }

    processingRef.current = true;

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      // Check if user is already a participant
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/bill_participants?bill_id=eq.${billId}&user_id=eq.${user.id}&select=id`,
        {
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const existing = await checkResponse.json();

      if (!existing || existing.length === 0) {
        // Not a participant yet - add them
        console.log('DeepLink: Adding user as participant');

        // Count existing participants to get next color
        const countResponse = await fetch(
          `${supabaseUrl}/rest/v1/bill_participants?bill_id=eq.${billId}&select=id`,
          {
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            }
          }
        );
        const existingParticipants = await countResponse.json();
        const participantCount = existingParticipants?.length || 0;

        const displayName = profile?.username || user.email?.split('@')[0] || 'Guest';

        const newParticipant = {
          bill_id: billId,
          user_id: user.id,
          name: displayName,
          is_guest: false,
          color: getNextColor(participantCount),
          initials: getInitials(displayName),
        };

        await fetch(
          `${supabaseUrl}/rest/v1/bill_participants`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(newParticipant),
          }
        );
      }

      // Navigate directly to bill editor (not party screen)
      console.log('DeepLink: Navigating to bill editor');
      router.push({
        pathname: '/bill/[id]',
        params: { id: billId, fromParty: 'true' }
      });

    } catch (err) {
      console.error('DeepLink: Error processing:', err);
      Alert.alert('Error', 'Could not join the bill. Please try again.');
    } finally {
      processingRef.current = false;
    }
  }, [session, user, profile, isLoading, router]);

  useEffect(() => {
    // Handle deep link when app is opened via link
    const handleUrl = ({ url }: { url: string }) => {
      handleDeepLink(url);
    };

    // Get initial URL (app was opened via link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for incoming links while app is open
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return null;
}

// Navigation controller - handles all routing logic
function NavigationController() {
  const { session, isLoading, hasOnboarded } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    // Don't navigate while loading - this is CRITICAL
    if (isLoading) {
      console.log('Navigation: Still loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inBillGroup = segments[0] === "bill";
    const inOnboardingGroup = segments[0] === "onboarding";

    console.log('Navigation: session=', !!session, 'hasOnboarded=', hasOnboarded, 'segments=', segments);

    if (!session) {
      // No session - must go to login
      if (!inAuthGroup) {
        console.log('Navigation: No session, redirecting to login');
        router.replace("/(auth)/login");
      }
    } else if (!hasOnboarded) {
      // Has session but hasn't completed onboarding
      // This handles BOTH missing profile rows (trigger failed) AND incomplete onboarding
      // The onboarding flow uses upsert to create/update the profile
      if (!inOnboardingGroup) {
        console.log('Navigation: Not onboarded, redirecting to onboarding');
        router.replace("/onboarding");
      }
    } else {
      // Has session AND onboarded - can access main app
      // Only redirect away from auth/onboarding screens
      if (inAuthGroup || inOnboardingGroup) {
        console.log('Navigation: Fully onboarded, redirecting to home');
        router.replace("/(tabs)");
      }
      // Otherwise, let user stay where they are (tabs, bill, etc.)
    }
  }, [session, isLoading, hasOnboarded, segments]);

  // Return null - this component only handles navigation
  return null;
}

// Protected layout - only renders content after auth check
function ProtectedLayout() {
  const { isLoading } = useAuth();

  // CRITICAL: Block rendering until auth check is complete
  // This prevents flash of wrong screens
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationController />
      <DeepLinkHandler />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ProtectedLayout />
    </AuthProvider>
  );
}


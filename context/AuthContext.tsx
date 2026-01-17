import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    isLoading: boolean;
    hasProfile: boolean;
    hasOnboarded: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    hasProfile: false,
    hasOnboarded: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasProfile, setHasProfile] = useState(false);
    const [hasOnboarded, setHasOnboarded] = useState(false);

    // Fetch profile helper - returns the profile or null
    const fetchProfile = useCallback(async (userId: string, accessToken?: string): Promise<any | null> => {
        console.log('AuthContext: Fetching Profile for', userId);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            const headers: Record<string, string> = {
                'apikey': supabaseKey!,
                'Content-Type': 'application/json',
            };

            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
                { headers, signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('AuthContext: Error fetching profile:', response.status);
                return null;
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const profile = data[0];
                console.log('AuthContext: Profile Found:', {
                    id: profile.id,
                    username: profile.username || '(not set)',
                    has_onboarded: profile.has_onboarded || false,
                });
                // Return profile even if username is null - onboarding will set it
                return profile;
            } else {
                console.log('AuthContext: No Profile Row Found (New User - trigger may have failed)');
                return null;
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.error('AuthContext: Profile fetch timed out');
            } else {
                console.error('AuthContext: Exception fetching profile:', e);
            }
            return null;
        }
    }, []);

    // Initial session check with timeout
    useEffect(() => {
        let mounted = true;

        // Timeout fallback - if auth takes too long, proceed without session
        const timeoutId = setTimeout(() => {
            if (mounted && isLoading) {
                console.log('AuthContext: Timeout! Proceeding without waiting for auth');
                setIsLoading(false);
            }
        }, 5000);

        const initializeAuth = async () => {
            console.log('AuthContext: Initializing auth...');

            try {
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.error('AuthContext: Session check error:', error);
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setHasProfile(false);
                    setIsLoading(false);
                    return;
                }

                console.log('AuthContext: Session check result:', currentSession ? 'Has Session' : 'No Session');

                if (currentSession?.user) {
                    setSession(currentSession);
                    setUser(currentSession.user);

                    // Fetch profile - but don't block forever
                    const profileData = await fetchProfile(currentSession.user.id, currentSession.access_token);

                    if (mounted) {
                        setProfile(profileData);
                        setHasProfile(!!profileData && !!profileData.username);
                        setHasOnboarded(!!profileData?.has_onboarded);
                        setIsLoading(false);
                    }
                } else {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setHasProfile(false);
                    setHasOnboarded(false);
                    setIsLoading(false);
                }
            } catch (e) {
                console.error('AuthContext: Initialization error:', e);
                if (mounted) {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setHasProfile(false);
                    setHasOnboarded(false);
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log(`AuthContext: Auth State Change [${event}]`);

            if (!mounted) return;

            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfile(null);
                setHasProfile(false);
                setHasOnboarded(false);
                return;
            }

            if (newSession?.user) {
                setSession(newSession);
                setUser(newSession.user);

                const profileData = await fetchProfile(newSession.user.id, newSession.access_token);
                if (mounted) {
                    setProfile(profileData);
                    setHasProfile(!!profileData && !!profileData.username);
                    setHasOnboarded(!!profileData?.has_onboarded);
                }
            } else {
                setSession(null);
                setUser(null);
                setProfile(null);
                setHasProfile(false);
                setHasOnboarded(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const refreshProfile = useCallback(async () => {
        if (user && session) {
            console.log('AuthContext: Refreshing profile...');
            const profileData = await fetchProfile(user.id, session.access_token);
            setProfile(profileData);
            setHasProfile(!!profileData && !!profileData.username);
            setHasOnboarded(!!profileData?.has_onboarded);
        }
    }, [user, session, fetchProfile]);

    const signOut = useCallback(async () => {
        console.log('AuthContext: Signing out...');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setHasProfile(false);
        setHasOnboarded(false);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                profile,
                isLoading,
                hasProfile,
                hasOnboarded,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

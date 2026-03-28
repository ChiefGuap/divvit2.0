import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert,
    ScrollView, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileSetupScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ firstName?: string; lastName?: string }>();
    const { session, user, refreshProfile } = useAuth();

    // Pre-populate username from Step 1 params or OAuth metadata
    const oauthName: string = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
    const rawName = params.firstName
        ? `${params.firstName}${params.lastName ? '_' + params.lastName : ''}`
        : oauthName;
    const initialUsername = rawName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    const [username, setUsername] = useState(initialUsername);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    // OAuth avatar (Google/Apple)
    const oauthAvatar: string | null = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
    const displayAvatar = photoUri || oauthAvatar;

    // Initials fallback
    const firstInitial = (params.firstName?.[0] || oauthName[0] || user?.email?.[0] || 'U').toUpperCase();
    const lastInitial = (params.lastName?.[0] || oauthName.split(' ')[1]?.[0] || '').toUpperCase();
    const initials = firstInitial + lastInitial;

    const handleCameraPress = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const saveProfile = async (skipUsername: boolean) => {
        if (!session?.user) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        if (!skipUsername && username.trim().length < 3) {
            Alert.alert('Username Required', 'Please choose a username with at least 3 characters.');
            return;
        }

        setLoading(true);
        await Haptics.selectionAsync();

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            const profileData: Record<string, any> = {
                id: session.user.id,
                has_onboarded: true,
                updated_at: new Date().toISOString(),
            };

            if (!skipUsername && username.trim()) {
                profileData.username = username.trim();
            }
            if (photoUri) {
                profileData.avatar_url = photoUri;
            } else if (oauthAvatar) {
                profileData.avatar_url = oauthAvatar;
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=representation',
                },
                body: JSON.stringify(profileData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save: ${response.status}`);
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // refreshProfile sets hasOnboarded=true → NavigationController redirects to /(tabs)
            await refreshProfile();
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'Failed to save profile');
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            {/* Ambient glow orbs */}
            <View style={{
                position: 'absolute', top: -SCREEN_WIDTH * 0.2, right: -SCREEN_WIDTH * 0.2,
                width: SCREEN_WIDTH * 0.7, height: SCREEN_WIDTH * 0.7,
                borderRadius: 9999, backgroundColor: 'rgba(75,41,180,0.05)',
            }} pointerEvents="none" />
            <View style={{
                position: 'absolute', top: '40%', left: -SCREEN_WIDTH * 0.35,
                width: SCREEN_WIDTH * 0.8, height: SCREEN_WIDTH * 0.8,
                borderRadius: 9999, backgroundColor: 'rgba(206,193,255,0.1)',
            }} pointerEvents="none" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 128 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header row */}
                <View style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8,
                }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: '#f1f3ff',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <ArrowLeft size={20} color="#484554" strokeWidth={2.5} />
                    </TouchableOpacity>

                    {/* Pagination dots — dot 2 active */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: 'rgba(99,70,205,0.2)' }} />
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#6346cd' }} />
                        <View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: 'rgba(99,70,205,0.2)' }} />
                    </View>
                </View>

                {/* Headline */}
                <View style={{ paddingHorizontal: 24, marginTop: 28, marginBottom: 32 }}>
                    <Text style={{
                        fontSize: 30, fontWeight: '800', color: '#141b2b',
                        letterSpacing: -0.5, marginBottom: 8,
                    }}>
                        Set up your profile
                    </Text>
                    <Text style={{
                        fontSize: 15, color: '#484554',
                        fontWeight: '500', lineHeight: 22,
                    }}>
                        Make it easier for friends to find you and split bills instantly.
                    </Text>
                </View>

                {/* Avatar section */}
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    {/* Avatar circle with camera button */}
                    <View style={{ position: 'relative' }}>
                        <View style={{
                            width: 112, height: 112, borderRadius: 56,
                            overflow: 'hidden',
                            borderWidth: 4, borderColor: '#ffffff',
                            shadowColor: '#141b2b',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.08, shadowRadius: 20,
                            elevation: 8,
                        }}>
                            {displayAvatar ? (
                                <Image
                                    source={{ uri: displayAvatar }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{
                                    flex: 1, backgroundColor: '#4b29b4',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Text style={{ fontSize: 36, fontWeight: '800', color: '#ffffff' }}>
                                        {initials}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Camera button */}
                        <TouchableOpacity
                            onPress={handleCameraPress}
                            activeOpacity={0.85}
                            style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: '#4b29b4',
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 2, borderColor: '#ffffff',
                                shadowColor: '#141b2b',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2, shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <Camera size={18} color="#ffffff" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <Text style={{
                        marginTop: 12, fontSize: 11, fontWeight: '700',
                        letterSpacing: 2, color: '#4b29b4',
                        textTransform: 'uppercase', textAlign: 'center',
                    }}>
                        Upload Photo
                    </Text>
                </View>

                {/* Username field */}
                <View style={{ paddingHorizontal: 24, marginTop: 28, marginBottom: 32 }}>
                    <Text style={sectionLabel}>Username</Text>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: '#f1f3ff',
                        borderRadius: 16, height: 56,
                        paddingHorizontal: 16,
                        borderWidth: usernameFocused ? 1.5 : 0,
                        borderColor: usernameFocused ? '#4b29b4' : 'transparent',
                    }}>
                        <Text style={{
                            fontSize: 18, fontWeight: '700',
                            color: '#4b29b4', marginRight: 8,
                        }}>
                            @
                        </Text>
                        <TextInput
                            style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#141b2b' }}
                            placeholder="yourname"
                            placeholderTextColor="rgba(72,69,84,0.5)"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={username}
                            onChangeText={setUsername}
                            onFocus={() => setUsernameFocused(true)}
                            onBlur={() => setUsernameFocused(false)}
                        />
                    </View>
                </View>

                {/* Connect Payments */}
                <View style={{ paddingHorizontal: 24 }}>
                    <Text style={sectionLabel}>Connect Payments</Text>

                    {/* Venmo */}
                    <View style={{
                        backgroundColor: '#f1f3ff', borderRadius: 24, padding: 20,
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between',
                        shadowColor: '#141b2b',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.04, shadowRadius: 16,
                        elevation: 2, marginBottom: 12,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                            <View style={{
                                width: 48, height: 48, borderRadius: 14,
                                backgroundColor: '#3d95ce',
                                alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '900' }}>V</Text>
                            </View>
                            <View>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#141b2b', marginBottom: 2 }}>
                                    Venmo
                                </Text>
                                <Text style={{ fontSize: 12, color: '#484554' }}>
                                    Sync contacts & pay
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Coming Soon', 'Venmo integration coming soon!')}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: 'rgba(75,41,180,0.1)',
                                paddingHorizontal: 16, paddingVertical: 8,
                                borderRadius: 999,
                            }}
                        >
                            <Text style={{ color: '#4b29b4', fontWeight: '700', fontSize: 13 }}>Connect</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Cash App */}
                    <View style={{
                        backgroundColor: '#f1f3ff', borderRadius: 24, padding: 20,
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between',
                        shadowColor: '#141b2b',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.04, shadowRadius: 16,
                        elevation: 2,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                            <View style={{
                                width: 48, height: 48, borderRadius: 14,
                                backgroundColor: '#00d036',
                                alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '900' }}>$</Text>
                            </View>
                            <View>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#141b2b', marginBottom: 2 }}>
                                    Cash App
                                </Text>
                                <Text style={{ fontSize: 12, color: '#484554' }}>
                                    Instant transfers
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Coming Soon', 'Cash App integration coming soon!')}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: 'rgba(75,41,180,0.1)',
                                paddingHorizontal: 16, paddingVertical: 8,
                                borderRadius: 999,
                            }}
                        >
                            <Text style={{ color: '#4b29b4', fontWeight: '700', fontSize: 13 }}>Connect</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={{
                        fontSize: 11, color: '#484554', opacity: 0.6,
                        textAlign: 'center', fontStyle: 'italic',
                        marginTop: 12, paddingHorizontal: 16, lineHeight: 16,
                    }}>
                        Connecting your payment apps helps you split bills with friends faster.
                    </Text>
                </View>
            </ScrollView>

            {/* Fixed footer */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: '#f9f9ff',
                paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
            }}>
                {/* Fade overlay */}
                <LinearGradient
                    colors={['rgba(249,249,255,0)', 'rgba(249,249,255,1)']}
                    style={{ position: 'absolute', top: -28, left: 0, right: 0, height: 28 }}
                    pointerEvents="none"
                />

                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                    {/* Skip */}
                    <TouchableOpacity
                        style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => saveProfile(true)}
                        disabled={loading}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#141b2b' }}>Skip</Text>
                    </TouchableOpacity>

                    {/* Continue */}
                    <TouchableOpacity
                        style={{
                            flex: 2,
                            shadowColor: '#4b29b4',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.2, shadowRadius: 16,
                            elevation: 8,
                        }}
                        onPress={() => saveProfile(false)}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#6346cd', '#4b29b4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{
                                height: 56, borderRadius: 999,
                                flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'center', gap: 8,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <>
                                    <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>
                                        Continue
                                    </Text>
                                    <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const sectionLabel = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#484554',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
};

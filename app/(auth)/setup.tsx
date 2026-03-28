import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert,
    KeyboardAvoidingView, Platform, ScrollView,
    Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const COUNTRIES = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'South Korea', 'China', 'India',
    'Brazil', 'Mexico', 'Argentina', 'Nigeria', 'South Africa', 'Kenya',
    'UAE', 'Saudi Arabia', 'Israel', 'Turkey', 'Netherlands', 'Sweden',
    'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium',
    'Portugal', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Greece',
    'New Zealand', 'Singapore', 'Malaysia', 'Philippines', 'Indonesia',
    'Thailand', 'Vietnam', 'Pakistan', 'Bangladesh', 'Egypt', 'Morocco',
    'Ethiopia', 'Ghana', 'Colombia', 'Chile', 'Peru', 'Venezuela',
];

const INPUT_BASE: object = {
    backgroundColor: '#f1f3ff',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#141b2b',
};

const INPUT_FOCUSED: object = {
    borderWidth: 1.5,
    borderColor: '#4b29b4',
};

export default function Setup() {
    const router = useRouter();
    const { session } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);

    const [focused, setFocused] = useState<string | null>(null);
    const [showCountryModal, setShowCountryModal] = useState(false);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [tempDob, setTempDob] = useState(new Date(2000, 0, 1));

    const dobDisplay = dob
        ? dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';

    const handleContinue = async () => {
        if (!firstName.trim()) {
            Alert.alert('Required', 'Please enter your first name.');
            return;
        }
        if (!session?.user) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        setLoading(true);
        await Haptics.selectionAsync();

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=representation',
                },
                body: JSON.stringify({
                    id: session.user.id,
                    first_name: firstName.trim(),
                    last_name: lastName.trim() || null,
                    phone: phone.trim() || null,
                    country: country || null,
                    date_of_birth: dob ? dob.toISOString().split('T')[0] : null,
                    updated_at: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save: ${response.status} — ${errorText}`);
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
                pathname: '/onboarding/profile-setup',
                params: { firstName, lastName },
            });
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // Navigate to Step 2 where the user can skip again to mark onboarding complete.
        // Calling router.replace('/(tabs)') directly won't work here because
        // has_onboarded is still false — NavigationController would redirect back.
        router.push('/onboarding/profile-setup');
    };

    const inputStyle = (name: string) => ({
        ...INPUT_BASE,
        ...(focused === name ? INPUT_FOCUSED : {}),
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9ff' }} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16,
            }}>
                {/* D icon + Divvit wordmark */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LinearGradient
                        colors={['#6346cd', '#4b29b4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            width: 34, height: 34, borderRadius: 10,
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>D</Text>
                    </LinearGradient>
                    <Text style={{ fontWeight: '800', fontSize: 20, color: '#4b29b4', letterSpacing: -0.5 }}>
                        Divvit
                    </Text>
                </View>

                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ color: '#484554', fontWeight: '600', fontSize: 15 }}>Skip</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Hero */}
                    <View style={{ marginBottom: 28, paddingHorizontal: 4 }}>
                        <Text style={{
                            fontSize: 30, fontWeight: '800', color: '#141b2b',
                            letterSpacing: -0.5, marginBottom: 8,
                        }}>
                            Welcome to Divvit!
                        </Text>
                        <Text style={{ fontSize: 16, color: '#484554', lineHeight: 24 }}>
                            Tell us a bit about yourself to get started.
                        </Text>
                    </View>

                    {/* Card */}
                    <View style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 32,
                        overflow: 'hidden',
                        shadowColor: '#141b2b',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.07, shadowRadius: 24,
                        elevation: 5,
                        marginBottom: 28,
                    }}>
                        {/* Accent bar */}
                        <LinearGradient
                            colors={['#6346cd', '#4b29b4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ height: 4 }}
                        />

                        <View style={{ padding: 24, gap: 16 }}>
                            {/* First + Last Name row */}
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={labelStyle}>First Name</Text>
                                    <TextInput
                                        style={inputStyle('firstName') as any}
                                        placeholder="Jane"
                                        placeholderTextColor="#9ca3af"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        onFocus={() => setFocused('firstName')}
                                        onBlur={() => setFocused(null)}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={labelStyle}>Last Name</Text>
                                    <TextInput
                                        style={inputStyle('lastName') as any}
                                        placeholder="Doe"
                                        placeholderTextColor="#9ca3af"
                                        value={lastName}
                                        onChangeText={setLastName}
                                        onFocus={() => setFocused('lastName')}
                                        onBlur={() => setFocused(null)}
                                    />
                                </View>
                            </View>

                            {/* Phone */}
                            <View>
                                <Text style={labelStyle}>Phone (optional)</Text>
                                <View style={{
                                    flexDirection: 'row', gap: 8, alignItems: 'center',
                                }}>
                                    <View style={{
                                        width: 60, height: 52,
                                        backgroundColor: '#f1f3ff', borderRadius: 14,
                                        alignItems: 'center', justifyContent: 'center',
                                        ...(focused === 'phone' ? INPUT_FOCUSED : {}),
                                    }}>
                                        <Text style={{ fontSize: 15, color: '#141b2b', fontWeight: '600' }}>+1</Text>
                                    </View>
                                    <TextInput
                                        style={[inputStyle('phone') as any, { flex: 1 }]}
                                        placeholder="(555) 000-0000"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                        onFocus={() => setFocused('phone')}
                                        onBlur={() => setFocused(null)}
                                    />
                                </View>
                            </View>

                            {/* Country */}
                            <View>
                                <Text style={labelStyle}>Country (optional)</Text>
                                <TouchableOpacity
                                    onPress={() => setShowCountryModal(true)}
                                    activeOpacity={0.8}
                                    style={{
                                        ...INPUT_BASE as any,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 15,
                                        color: country ? '#141b2b' : '#9ca3af',
                                    }}>
                                        {country || 'Select country'}
                                    </Text>
                                    <ChevronDown size={18} color="#797585" strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            {/* Date of Birth */}
                            <View>
                                <Text style={labelStyle}>Date of Birth (optional)</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDobPicker(true)}
                                    activeOpacity={0.8}
                                    style={{
                                        ...INPUT_BASE as any,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 15,
                                        color: dob ? '#141b2b' : '#9ca3af',
                                    }}>
                                        {dobDisplay || 'Select date'}
                                    </Text>
                                    <ChevronDown size={18} color="#797585" strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Pagination dots */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                        <View style={{ width: 32, height: 8, borderRadius: 4, backgroundColor: '#6346cd' }} />
                        <View style={{ width: 10, height: 8, borderRadius: 4, backgroundColor: '#e1e8fd' }} />
                        <View style={{ width: 10, height: 8, borderRadius: 4, backgroundColor: '#e1e8fd' }} />
                    </View>

                    {/* Continue button */}
                    <TouchableOpacity
                        onPress={handleContinue}
                        activeOpacity={0.85}
                        disabled={loading}
                        style={{
                            shadowColor: '#4b29b4',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.25, shadowRadius: 16,
                            elevation: 8,
                        }}
                    >
                        <LinearGradient
                            colors={['#6346cd', '#4b29b4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{
                                height: 58, borderRadius: 999,
                                flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'center', gap: 10,
                            }}
                        >
                            {loading
                                ? <ActivityIndicator color="#ffffff" size="small" />
                                : <>
                                    <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>Continue</Text>
                                    <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                                </>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Country Picker Modal */}
            <Modal
                visible={showCountryModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCountryModal(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20, paddingVertical: 16,
                        borderBottomWidth: 1, borderBottomColor: '#f1f3ff',
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#141b2b' }}>Select Country</Text>
                        <TouchableOpacity onPress={() => setShowCountryModal(false)} activeOpacity={0.7}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#4b29b4' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                        {COUNTRIES.map((c) => (
                            <TouchableOpacity
                                key={c}
                                onPress={() => { setCountry(c); setShowCountryModal(false); }}
                                activeOpacity={0.7}
                                style={{
                                    paddingHorizontal: 20, paddingVertical: 16,
                                    borderBottomWidth: 1, borderBottomColor: '#f1f3ff',
                                    backgroundColor: country === c ? '#f1f3ff' : '#ffffff',
                                }}
                            >
                                <Text style={{
                                    fontSize: 16, color: '#141b2b',
                                    fontWeight: country === c ? '700' : '400',
                                }}>
                                    {c}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* DOB Picker Modal (iOS) */}
            {Platform.OS === 'ios' && (
                <Modal
                    visible={showDobPicker}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowDobPicker(false)}
                >
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 20, paddingVertical: 16,
                            borderBottomWidth: 1, borderBottomColor: '#f1f3ff',
                        }}>
                            <TouchableOpacity onPress={() => setShowDobPicker(false)} activeOpacity={0.7}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#797585' }}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#141b2b' }}>Date of Birth</Text>
                            <TouchableOpacity
                                onPress={() => { setDob(tempDob); setShowDobPicker(false); }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#4b29b4' }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={tempDob}
                            mode="date"
                            display="spinner"
                            maximumDate={new Date()}
                            onChange={(_, date) => { if (date) setTempDob(date); }}
                            style={{ flex: 1 }}
                        />
                    </SafeAreaView>
                </Modal>
            )}

            {/* DOB Picker inline (Android) */}
            {Platform.OS === 'android' && showDobPicker && (
                <DateTimePicker
                    value={tempDob}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(_, date) => {
                        setShowDobPicker(false);
                        if (date) { setTempDob(date); setDob(date); }
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const labelStyle = {
    fontSize: 11, fontWeight: '700' as const,
    color: '#484554', textTransform: 'uppercase' as const,
    letterSpacing: 1.5, marginBottom: 8, marginLeft: 2,
};

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Signup() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const handleSignup = async () => {
        console.log("DEBUG: Sign Up Button Pressed");

        if (!email || !password) {
            Alert.alert('Required', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            console.log("DEBUG: Attempting Supabase Sign Up");
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            console.log("DEBUG: Supabase Response", { data, error });

            if (error) throw error;

            if (data.session) {
                console.log("Signup success, session active");
            } else {
                Alert.alert('Check your inbox!', 'Please verify your email to continue.');
            }
        } catch (e: any) {
            console.error("DEBUG: Signup Exception", e);
            Alert.alert('Registration Failed', e.message || "Unknown Error");
        } finally {
            setLoading(false);
        }
    };

    const handleFocus = (inputName: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFocusedInput(inputName);
    };

    const handleBlur = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFocusedInput(null);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white px-6 justify-center"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View className="items-center mb-12">
                <View className="mb-4">
                    <Text className="text-divvit-secondary text-5xl font-heading font-thin">D</Text>
                </View>
                <Text className="text-3xl text-divvit-text font-heading font-bold mb-2">Create an account</Text>
                <Text className="text-divvit-muted font-body text-sm">Join Divvit to split bills effortlessly!</Text>
            </View>

            {/* Form */}
            <View className="gap-6 mb-8">
                {/* Email Input */}
                <View>
                    <Text className={`text-sm mb-2 font-body font-medium ${focusedInput === 'email' ? 'text-divvit-secondary' : 'text-divvit-muted'}`}>
                        E-mail
                    </Text>
                    <View className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${focusedInput === 'email' ? 'border-divvit-secondary' : 'border-divvit-input-border'}`}>
                        <TextInput
                            className="text-divvit-text font-body text-base h-full"
                            placeholder="example@email.com"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => handleFocus('email')}
                            onBlur={handleBlur}
                        />
                    </View>
                </View>

                {/* Password Input */}
                <View>
                    <Text className={`text-sm mb-2 font-body font-medium ${focusedInput === 'password' ? 'text-divvit-secondary' : 'text-divvit-muted'}`}>
                        Password
                    </Text>
                    <View className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${focusedInput === 'password' ? 'border-divvit-secondary' : 'border-divvit-input-border'}`}>
                        <TextInput
                            className="text-divvit-text font-body text-base h-full"
                            placeholder="Create a password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            onFocus={() => handleFocus('password')}
                            onBlur={handleBlur}
                        />
                    </View>
                </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                onPress={handleSignup}
                disabled={loading}
                className="bg-divvit-secondary h-14 rounded-2xl items-center justify-center mb-8"
                style={{
                    shadowColor: '#B54CFF',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                }}
                activeOpacity={0.8}
            >
                {loading ? (
                    <Text className="text-white font-bold text-lg">Creating Account...</Text>
                ) : (
                    <Text className="text-white font-bold text-lg">Sign Up</Text>
                )}
            </TouchableOpacity>

            {/* Footer Navigation */}
            <View className="flex-row justify-center gap-1">
                <Text className="text-divvit-muted">Already have an account?</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-divvit-secondary font-bold">Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

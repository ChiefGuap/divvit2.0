import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronDown, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Country list - top countries first
const COUNTRIES = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'India',
    'Brazil',
    'Mexico',
    'Spain',
    'Italy',
    'Netherlands',
    'Sweden',
    'Singapore',
    'Other',
];

export default function PersonalInfoScreen() {
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }
        if (!phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\+?[\d\s-]{10,}$/.test(phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Enter a valid phone number';
        }
        if (!country) {
            newErrors.country = 'Please select your country';
        }
        if (!dob) {
            newErrors.dob = 'Date of birth is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [firstName, lastName, phone, country, dob]);

    const handleContinue = async () => {
        await Haptics.selectionAsync();

        if (!validateForm()) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Navigate to setup screen with personal info as params
        router.push({
            pathname: '/onboarding/setup',
            params: {
                firstName,
                lastName,
                phone,
                country,
                dob: dob?.toISOString(),
            },
        });
    };

    const handleBack = async () => {
        await Haptics.selectionAsync();
        router.back();
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDob(selectedDate);
            setErrors((prev) => ({ ...prev, dob: '' }));
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Maximum date is 13 years ago (minimum age)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 13);

    // Minimum date is 120 years ago
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center px-6 py-4">
                <TouchableOpacity onPress={handleBack} className="mr-4">
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xs text-divvit-muted font-body">Step 1 of 2</Text>
                    <Text className="text-lg font-heading font-bold text-divvit-text">Personal Info</Text>
                </View>
            </View>

            <KeyboardAwareScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                extraScrollHeight={120}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <View className="mb-8 mt-4">
                    <Text className="text-2xl font-heading font-bold text-divvit-text mb-2">
                        Tell us about yourself
                    </Text>
                    <Text className="text-divvit-muted font-body text-sm">
                        We'll use this to personalize your experience.
                    </Text>
                </View>

                {/* Form */}
                <View className="gap-5">
                    {/* First Name */}
                    <View>
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            First Name
                        </Text>
                        <View
                            className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${errors.firstName ? 'border-red-500' : 'border-divvit-input-border'
                                }`}
                        >
                            <TextInput
                                className="text-divvit-text font-body text-base h-full"
                                placeholder="John"
                                placeholderTextColor="#9CA3AF"
                                value={firstName}
                                onChangeText={(text) => {
                                    setFirstName(text);
                                    setErrors((prev) => ({ ...prev, firstName: '' }));
                                }}
                                autoCapitalize="words"
                            />
                        </View>
                        {errors.firstName && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.firstName}</Text>
                        )}
                    </View>

                    {/* Last Name */}
                    <View>
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Last Name
                        </Text>
                        <View
                            className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${errors.lastName ? 'border-red-500' : 'border-divvit-input-border'
                                }`}
                        >
                            <TextInput
                                className="text-divvit-text font-body text-base h-full"
                                placeholder="Doe"
                                placeholderTextColor="#9CA3AF"
                                value={lastName}
                                onChangeText={(text) => {
                                    setLastName(text);
                                    setErrors((prev) => ({ ...prev, lastName: '' }));
                                }}
                                autoCapitalize="words"
                            />
                        </View>
                        {errors.lastName && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.lastName}</Text>
                        )}
                    </View>

                    {/* Phone */}
                    <View>
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Phone Number
                        </Text>
                        <View
                            className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 justify-center ${errors.phone ? 'border-red-500' : 'border-divvit-input-border'
                                }`}
                        >
                            <TextInput
                                className="text-divvit-text font-body text-base h-full"
                                placeholder="+1 (555) 123-4567"
                                placeholderTextColor="#9CA3AF"
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    setErrors((prev) => ({ ...prev, phone: '' }));
                                }}
                                keyboardType="phone-pad"
                            />
                        </View>
                        {errors.phone && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.phone}</Text>
                        )}
                    </View>

                    {/* Country Selector */}
                    <View>
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Country
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowCountryPicker(true)}
                            className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 flex-row items-center justify-between ${errors.country ? 'border-red-500' : 'border-divvit-input-border'
                                }`}
                            activeOpacity={0.7}
                        >
                            <Text
                                className={`font-body text-base ${country ? 'text-divvit-text' : 'text-gray-400'
                                    }`}
                            >
                                {country || 'Select your country'}
                            </Text>
                            <ChevronDown size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                        {errors.country && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.country}</Text>
                        )}
                    </View>

                    {/* Date of Birth */}
                    <View>
                        <Text className="text-sm mb-2 font-body font-medium text-divvit-muted">
                            Date of Birth
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className={`bg-divvit-input-bg border rounded-2xl h-14 px-4 flex-row items-center justify-between ${errors.dob ? 'border-red-500' : 'border-divvit-input-border'
                                }`}
                            activeOpacity={0.7}
                        >
                            <Text
                                className={`font-body text-base ${dob ? 'text-divvit-text' : 'text-gray-400'
                                    }`}
                            >
                                {dob ? formatDate(dob) : 'Select date'}
                            </Text>
                            <Calendar size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                        {errors.dob && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.dob}</Text>
                        )}
                    </View>
                </View>

                {/* Continue Button */}
                <View className="px-6 pb-8 pt-4 bg-white">
                    <TouchableOpacity
                        onPress={handleContinue}
                        className="bg-divvit-secondary h-14 rounded-2xl items-center justify-center"
                        style={{
                            shadowColor: '#B54CFF',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-lg">Continue</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>

            {/* Country Picker Modal */}
            <Modal
                visible={showCountryPicker}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                        <Text className="text-lg font-heading font-bold text-divvit-text">
                            Select Country
                        </Text>
                        <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                            <Text className="text-divvit-secondary font-body font-medium">Done</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1">
                        {COUNTRIES.map((c) => (
                            <TouchableOpacity
                                key={c}
                                onPress={() => {
                                    setCountry(c);
                                    setErrors((prev) => ({ ...prev, country: '' }));
                                    setShowCountryPicker(false);
                                    Haptics.selectionAsync();
                                }}
                                className={`px-6 py-4 border-b border-gray-100 ${country === c ? 'bg-purple-50' : ''
                                    }`}
                            >
                                <Text
                                    className={`text-base font-body ${country === c ? 'text-divvit-secondary font-medium' : 'text-divvit-text'
                                        }`}
                                >
                                    {c}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Date Picker */}
            {showDatePicker && (
                <Modal
                    visible={showDatePicker}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    transparent={Platform.OS === 'android'}
                >
                    {Platform.OS === 'ios' ? (
                        <SafeAreaView className="flex-1 bg-white">
                            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                                <Text className="text-lg font-heading font-bold text-divvit-text">
                                    Date of Birth
                                </Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text className="text-divvit-secondary font-body font-medium">Done</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1 justify-center">
                                <DateTimePicker
                                    value={dob || maxDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    maximumDate={maxDate}
                                    minimumDate={minDate}
                                    textColor="#111827"
                                />
                            </View>
                        </SafeAreaView>
                    ) : (
                        <DateTimePicker
                            value={dob || maxDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            maximumDate={maxDate}
                            minimumDate={minDate}
                        />
                    )}
                </Modal>
            )}
        </SafeAreaView>
    );
}

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Mail, Phone, Globe, Contact } from 'lucide-react-native';

interface Props {
    isEditing: boolean;
    email: string;
    phone: string;
    setPhone: (val: string) => void;
    country: string;
}

export default function ContactInfoCard({ isEditing, email, phone, setPhone, country }: Props) {
    return (
        <View className="bg-surface-container-low p-6 rounded-3xl space-y-6">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm font-bold uppercase tracking-widest text-primary">Contact Information</Text>
                <Contact color="rgba(75, 41, 180, 0.4)" size={20} />
            </View>

            <View className="space-y-4">
                {/* Email */}
                <View className="flex-row items-center bg-surface-container-lowest p-4 rounded-2xl">
                    <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: 'rgba(75, 41, 180, 0.05)' }}>
                        <Mail color="#4b29b4" size={20} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] uppercase tracking-wider text-[#484554] font-bold">Email Address</Text>
                        <Text className="text-on-surface font-semibold">{email}</Text>
                    </View>
                </View>

                {/* Phone */}
                <View className="flex-row items-center bg-surface-container-lowest p-4 rounded-2xl mt-4">
                    <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: 'rgba(75, 41, 180, 0.05)' }}>
                        <Phone color="#4b29b4" size={20} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] uppercase tracking-wider text-[#484554] font-bold">Phone Number</Text>
                        {isEditing ? (
                            <TextInput
                                className="text-on-surface font-semibold bg-surface-container-low border border-[#cac4d6] rounded-xl h-8 px-2 mt-1"
                                placeholder="Add phone number"
                                placeholderTextColor="#9CA3AF"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text className="text-on-surface font-semibold">{phone || 'Not Set'}</Text>
                        )}
                    </View>
                </View>

                {/* Country */}
                <View className="flex-row items-center bg-surface-container-lowest p-4 rounded-2xl mt-4">
                    <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: 'rgba(75, 41, 180, 0.05)' }}>
                        <Globe color="#4b29b4" size={20} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] uppercase tracking-wider text-[#484554] font-bold">Country</Text>
                        <Text className="text-on-surface font-semibold">{country}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

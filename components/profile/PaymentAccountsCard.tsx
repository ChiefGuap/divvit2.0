import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { CreditCard, DollarSign } from 'lucide-react-native';

interface Props {
    isEditing: boolean;
    venmoHandle: string;
    setVenmoHandle: (val: string) => void;
    cashappHandle: string;
    setCashappHandle: (val: string) => void;
}

export default function PaymentAccountsCard({ isEditing, venmoHandle, setVenmoHandle, cashappHandle, setCashappHandle }: Props) {
    return (
        <View className="bg-surface-container-low p-6 rounded-3xl mt-4">
            <Text className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Connected Accounts</Text>
            
            <View className="space-y-3">
                {/* Venmo */}
                <View className="flex-row items-center justify-between bg-surface-container-lowest p-4 rounded-2xl">
                    <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(0, 140, 255, 0.1)' }}>
                            <CreditCard color="#008CFF" size={16} />
                        </View>
                        {isEditing ? (
                            <View className="flex-row items-center">
                                <Text className="text-[#484554] mr-1">@</Text>
                                <TextInput
                                    className="text-sm font-bold bg-surface-container-low rounded-lg h-7 px-2 min-w-[100px]"
                                    placeholder="venmo_handle"
                                    value={venmoHandle}
                                    onChangeText={setVenmoHandle}
                                    autoCapitalize="none"
                                />
                            </View>
                        ) : (
                            <Text className="font-bold text-sm text-on-surface">{venmoHandle ? `@${venmoHandle}` : 'Venmo'}</Text>
                        )}
                    </View>
                    <Text className={`text-xs font-bold ${venmoHandle ? 'text-primary' : 'text-[#484554]/40'}`}>
                        {venmoHandle ? 'Linked' : 'Not Linked'}
                    </Text>
                </View>

                {/* Cash App */}
                <View className="flex-row items-center justify-between bg-surface-container-lowest p-4 rounded-2xl mt-3">
                    <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(0, 214, 50, 0.1)' }}>
                            <DollarSign color="#00D632" size={16} />
                        </View>
                        {isEditing ? (
                            <View className="flex-row items-center">
                                <Text className="text-[#484554] mr-1">$</Text>
                                <TextInput
                                    className="text-sm font-bold bg-surface-container-low rounded-lg h-7 px-2 min-w-[100px]"
                                    placeholder="cashtag"
                                    value={cashappHandle}
                                    onChangeText={setCashappHandle}
                                    autoCapitalize="none"
                                />
                            </View>
                        ) : (
                            <Text className="font-bold text-sm text-on-surface">{cashappHandle ? `$${cashappHandle}` : 'Cash App'}</Text>
                        )}
                    </View>
                    <Text className={`text-xs font-bold ${cashappHandle ? 'text-primary' : 'text-[#484554]/40'}`}>
                        {cashappHandle ? 'Linked' : 'Not Linked'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

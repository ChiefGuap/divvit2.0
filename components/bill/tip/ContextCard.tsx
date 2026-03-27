import React from 'react';
import { View, Text, Image } from 'react-native';
import { Utensils } from 'lucide-react-native';

type User = {
    id: string;
    name: string;
    avatar: string;
    color: string;
    initials: string;
};

type Props = {
    restaurantName: string;
    contextDescription: string;
    users: User[];
};

export default function ContextCard({ restaurantName, contextDescription, users }: Props) {
    // Only show up to 2 avatars to match design
    const displayUsers = users.slice(0, 2);
    const extraUsersCount = users.length > 2 ? users.length - 2 : 0;

    return (
        <View className="bg-primary p-6 rounded-[32px] overflow-hidden justify-between mb-4">
            <View className="z-10">
                <View className="mb-2">
                    <Utensils size={32} color="#ffffff" strokeWidth={1.5} />
                </View>
                <Text className="font-heading font-bold text-xl text-on-primary ml-1">{restaurantName || 'Restaurant'}</Text>
                <Text className="opacity-80 text-sm text-on-primary ml-1 mt-1">{contextDescription || 'Bill Split'}</Text>
            </View>
            
            <View className="mt-8 flex-row items-center z-10 ml-1">
                <View className="flex-row">
                    {displayUsers.map((user, index) => (
                        <View 
                            key={user.id} 
                            style={{ marginLeft: index > 0 ? -8 : 0 }}
                            className="w-8 h-8 rounded-full border-2 border-primary bg-white overflow-hidden items-center justify-center"
                        >
                            {user.avatar ? (
                                <Image source={{ uri: user.avatar }} style={{ width: 32, height: 32 }} />
                            ) : (
                                <Text className="text-[10px] text-primary font-bold">{user.initials}</Text>
                            )}
                        </View>
                    ))}
                    {extraUsersCount > 0 && (
                        <View 
                            style={{ marginLeft: -8 }}
                            className="w-8 h-8 rounded-full border-2 border-primary bg-primary-container flex items-center justify-center"
                        >
                            <Text className="text-[10px] font-bold text-on-primary">+{extraUsersCount}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-xs font-medium text-on-primary ml-3">Split {users.length} ways</Text>
            </View>
        </View>
    );
}

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Star, Tag, Clock, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#f9f9ff' },
        tabBarActiveTintColor: '#6346cd',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 8,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: 'Outfit',
          marginTop: 2,
          marginBottom: 0,
          textTransform: 'none',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused }) => (
            <Star
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Promos',
          tabBarIcon: ({ color, size, focused }) => {
            if (!__DEV__) {
              return (
                <View style={{ alignItems: 'center' }}>
                  {/* Greyed icon */}
                  <Tag 
                    size={size || 24} 
                    color="#d1d5db"
                    strokeWidth={focused ? 2.5 : 2}
                  />
                  {/* Tiny "Soon" dot badge */}
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -6,
                    backgroundColor: '#6346cd',
                    borderRadius: 999,
                    paddingHorizontal: 3,
                    paddingVertical: 1,
                    minWidth: 20,
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      fontSize: 7,
                      fontWeight: '800',
                      color: 'white',
                      letterSpacing: 0.3,
                    }}>
                      SOON
                    </Text>
                  </View>
                </View>
              );
            }
            // Normal icon in dev
            return (
              <Tag 
                size={size || 24} 
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            );
          },
          tabBarLabel: ({ color }) => {
            const labelColor = !__DEV__ ? '#d1d5db' : color;
            return (
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                fontFamily: 'Outfit',
                color: labelColor,
                marginTop: 2,
                marginBottom: 0,
                textTransform: 'none',
              }}>
                Promos
              </Text>
            );
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Clock
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});


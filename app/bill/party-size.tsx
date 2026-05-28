import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Users, MinusCircle, PlusCircle, ArrowRight, User } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import DivvitLogo from '../../components/DivvitLogo';

// DESIGN SYSTEM (Indigo Velvet)
const COLORS = {
  primary: '#6346cd',
  surface: '#f9f9ff',
  surfaceContainer: '#f1f3ff',
  onSurface: '#111827',
  outline: '#9ca3af',
};

export default function PartySizeScreen() {
  const router = useRouter();
  const { billId, billData, isManualEntry } = useLocalSearchParams<{
    billId: string;
    billData?: string;
    isManualEntry?: string;
  }>();
  const { profile } = useAuth();
  
  const [count, setCount] = useState(2);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Get current user for avatar
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const animateCountChange = (newCount: number) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCount(newCount);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleContinue = () => {
    router.push({
      pathname: '/bill/party',
      params: { 
        id: billId,
        billId: billId,
        partySize: count.toString(),
        billData: billData,
        isManualEntry: isManualEntry
      }
    });
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER (sticky with soft blur effect) */}
      <BlurView intensity={30} style={s.header} tint="light">
        <View style={s.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={s.backButton}
          >
            <ArrowLeft size={20} color={COLORS.primary} />
          </TouchableOpacity>
          
          <DivvitLogo />
          
          <View style={s.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <User size={20} color={COLORS.primary} />
              </View>
            )}
          </View>
        </View>
      </BlurView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* EDITORIAL HEADER SECTION */}
        <View style={s.editorialHeader}>
          <View style={s.pillBadge}>
            <Text style={s.pillBadgeText}>LET'S DIVVIT</Text>
          </View>
          <Text style={s.headline}>
            How many people are <Text style={s.headlineHighlight}>splitting?</Text>
          </Text>
          <Text style={s.subtitle}>
            We'll calculate the exact share for everyone.
          </Text>
        </View>

        {/* MAIN COUNTER CARD */}
        <View style={s.counterCard}>
          {/* Decorative blur circles */}
          <View style={s.circle1} />
          <View style={s.circle2} />

          <Text style={s.totalPartyLabel}>TOTAL PARTY</Text>
          
          <Animated.Text
            style={[
              s.counterNumber,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {count}
          </Animated.Text>

          <View style={s.peopleRow}>
            <Users size={22} color="rgba(255,255,255,0.65)" />
            <Text style={s.peopleText}>People Total</Text>
          </View>
        </View>

        {/* PLUS / MINUS BUTTONS */}
        <View style={s.buttonsRow}>
          <TouchableOpacity
            style={s.counterButton}
            activeOpacity={0.7}
            onPress={() => {
              if (count > 1) animateCountChange(count - 1);
            }}
          >
            <MinusCircle size={32} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.counterButton}
            activeOpacity={0.7}
            onPress={() => {
              if (count < 99) animateCountChange(count + 1);
            }}
          >
            <PlusCircle size={32} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* QUICK SELECT ROW */}
        <View style={s.quickSelectSection}>
          <Text style={s.quickSelectLabel}>QUICK SELECT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.quickSelectScroll}
          >
            {[2, 3, 4, 5, 6, 8].map((num) => {
              const isSelected = count === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[
                    s.quickSelectPill,
                    isSelected ? s.quickSelectPillSelected : s.quickSelectPillUnselected,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => animateCountChange(num)}
                >
                  <Text
                    style={[
                      s.quickSelectText,
                      isSelected ? s.quickSelectTextSelected : s.quickSelectTextUnselected,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* CONTINUE BUTTON */}
        <View style={s.continueContainer}>
          <TouchableOpacity
            style={s.continueButton}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <Text style={s.continueText}>Continue to Items</Text>
            <ArrowRight size={22} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,70,205,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 60,
    marginTop: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainer,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  editorialHeader: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  pillBadge: {
    backgroundColor: 'rgba(99,70,205,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pillBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headlineHighlight: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.outline,
    fontWeight: '500',
    marginTop: 4,
  },
  counterCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    marginHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 6,
  },
  circle1: {
    position: 'absolute',
    top: -48,
    left: -48,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 64,
  },
  circle2: {
    position: 'absolute',
    bottom: -32,
    right: -32,
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 80,
  },
  totalPartyLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  counterNumber: {
    color: 'white',
    fontSize: 80,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 80,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  peopleText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginHorizontal: 24,
  },
  counterButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(36,27,77,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  quickSelectSection: {
    marginTop: 16,
    marginHorizontal: 24,
  },
  quickSelectLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.outline,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quickSelectScroll: {
    paddingVertical: 2,
  },
  quickSelectPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSelectPillSelected: {
    backgroundColor: COLORS.primary,
    shadowColor: 'rgba(99,70,205,0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  quickSelectPillUnselected: {
    backgroundColor: 'white',
    shadowColor: 'rgba(36,27,77,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  quickSelectText: {
    fontSize: 15,
    fontWeight: '800',
  },
  quickSelectTextSelected: {
    color: 'white',
  },
  quickSelectTextUnselected: {
    color: COLORS.onSurface,
  },
  continueContainer: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  continueButton: {
    width: '100%',
    height: 54,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});

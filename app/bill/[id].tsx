import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Keyboard } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    FadeInDown,
    useAnimatedProps,
    withTiming,
    FadeIn,
    Layout
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArrowLeft, Check, ArrowRight, Plus, Trash2, Save, Shuffle, Users } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// --- Default Types ---

type User = {
    id: string;
    name: string;
    avatar: string;
    color: string;
    initials: string;
};

type BillItem = {
    id: string;
    name: string;
    price: number;
};

// --- Helper Functions ---

const createEmptyItem = (): BillItem => ({
    id: Crypto.randomUUID(),
    name: '',
    price: 0
});

// --- Components ---

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const AnimatedNumber = ({ value, className, style }: { value: number; className?: string; style?: any }) => {
    const animatedValue = useSharedValue(value);

    useEffect(() => {
        animatedValue.value = withTiming(value, { duration: 500 });
    }, [value]);

    const animatedProps = useAnimatedProps(() => {
        return {
            text: `$${animatedValue.value.toFixed(2)}`,
        } as any;
    });

    return (
        <AnimatedTextInput
            underlineColorAndroid="transparent"
            editable={false}
            value={`$${value.toFixed(2)}`}
            animatedProps={animatedProps}
            className={className}
            style={style}
        />
    );
};

const UserAvatar = ({
    user,
    isSelected,
    onPress,
    total
}: {
    user: User;
    isSelected: boolean;
    onPress: () => void;
    total: number;
}) => {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withSpring(isSelected ? 1.15 : 1, { damping: 12 });
    }, [isSelected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="items-center mx-3"
        >
            <Animated.View style={[animatedStyle]} className="relative mb-2">
                <View
                    className={`w-14 h-14 rounded-full items-center justify-center border-2 ${isSelected ? 'border-divvit-secondary' : 'border-transparent'}`}
                    style={{ backgroundColor: user.color }}
                >
                    <Text className="font-heading text-lg text-white font-bold">
                        {user.initials}
                    </Text>
                </View>
                {isSelected && (
                    <View className="absolute -bottom-1 w-full items-center">
                        <View className="bg-divvit-secondary rounded-full p-0.5 shadow-sm">
                            <Check size={10} color="white" strokeWidth={3} />
                        </View>
                    </View>
                )}
            </Animated.View>
            <Text className={`font-medium text-xs mb-0.5 ${isSelected ? 'text-divvit-text' : 'text-divvit-muted'}`}>
                {user.name}
            </Text>
            <Text className="text-divvit-text font-heading text-xs">
                ${total.toFixed(2)}
            </Text>
        </TouchableOpacity>
    );
};

// Swipeable Delete Action
const RenderRightActions = ({ onDelete }: { onDelete: () => void }) => {
    return (
        <TouchableOpacity
            onPress={onDelete}
            activeOpacity={0.8}
            className="bg-red-500 justify-center items-center px-6 rounded-r-2xl"
        >
            <Trash2 size={20} color="white" />
            <Text className="text-white text-xs mt-1 font-medium">Delete</Text>
        </TouchableOpacity>
    );
};

export default function BillEditorScreen() {
    const router = useRouter();
    const { id, billData, users: usersParam, fromParty } = useLocalSearchParams<{ id: string; billData: string; users: string; fromParty: string }>();
    const { user, session } = useAuth();
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

    // Debug logging for deep link verification
    console.log('BillEditor: Opened with ID:', id);
    console.log('BillEditor: fromParty:', fromParty);

    // Check if this is an existing draft (id is a valid UUID, not 'new')
    const isExistingDraft = id && id !== 'new' && id.length > 10;
    // Check if coming from party screen (use participants from DB)
    const isFromParty = fromParty === 'true';

    // Parse incoming user data or fall back to empty (will be loaded from DB)
    const initialUsers = useMemo(() => {
        if (usersParam) {
            try {
                return JSON.parse(usersParam) as User[];
            } catch (e) {
                console.error("Failed to parse usersParam", e);
            }
        }
        return []; // No mock data - participants will be loaded from DB
    }, [usersParam]);

    // Parse incoming bill data - Universal Logic
    const { initialItems, scannedTip } = useMemo((): { initialItems: BillItem[]; scannedTip: number } => {
        if (billData) {
            try {
                const parsed = JSON.parse(billData);
                const rawItems = (parsed.items as any[]) || [];

                if (rawItems.length > 0) {
                    // Scanned mode: pre-fill with items
                    const itemsWithIds = rawItems.map((item, index) => ({
                        ...item,
                        id: item.id || Crypto.randomUUID(),
                        name: item.name || '',
                        price: Number(item.price) || 0
                    }));
                    return {
                        initialItems: itemsWithIds,
                        scannedTip: Number(parsed.scanned_tip) || Number(parsed.scannedTip) || 0
                    };
                }
            } catch (e) {
                console.error("Failed to parse billData", e);
            }
        }
        // Manual mode: start with one empty row
        return { initialItems: [createEmptyItem()], scannedTip: 0 };
    }, [billData]);

    // State
    const [items, setItems] = useState<BillItem[]>(initialItems);
    const [selectedUserId, setSelectedUserId] = useState<string>(initialUsers[0]?.id ?? '');
    const [assignments, setAssignments] = useState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(isExistingDraft || isFromParty);
    const [loadedUsers, setLoadedUsers] = useState<User[]>(initialUsers);
    const [loadedScannedTip, setLoadedScannedTip] = useState(scannedTip);
    const [hostId, setHostId] = useState<string | null>(null);
    const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
    // Track raw price text for each item to allow typing decimals like "12."
    const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

    // Determine if current user is host
    const isHost = user?.id === hostId;

    // Fetch bill data and participants from Supabase - DEEP JOIN FIX
    useEffect(() => {
        if ((!isExistingDraft && !isFromParty) || !user || !session) return;

        const fetchBillData = async () => {
            try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

                // BLANK BILL FIX: Use Deep Join to get bill AND participants in one query
                const billResponse = await fetch(
                    `${supabaseUrl}/rest/v1/bills?id=eq.${id}&select=*,bill_participants(*)`,
                    {
                        headers: {
                            'apikey': supabaseKey!,
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (!billResponse.ok) {
                    console.error('Error fetching bill data:', billResponse.status);
                    setIsLoadingDraft(false);
                    return;
                }

                const billData = await billResponse.json();
                if (!billData || billData.length === 0) {
                    console.error('No bill data found for id:', id);
                    setIsLoadingDraft(false);
                    return;
                }

                const bill = billData[0];
                setHostId(bill.host_id);

                // CRUCIAL: Load items directly from data.items (JSONB column)
                // First check top-level items, then fall back to details.items for backward compatibility
                const itemsData = bill.items || bill.details?.items || [];
                if (itemsData.length > 0) {
                    setItems(itemsData);
                }

                // Load assignments from details (still stored there)
                const details = bill.details || {};
                if (details.assignments) {
                    setAssignments(details.assignments);
                }

                // Load scanned tip
                const tipValue = bill.scanned_tip ?? details.scannedTip ?? 0;
                if (tipValue) {
                    setLoadedScannedTip(tipValue);
                }

                // CRUCIAL: Load participants from bill_participants (deep join result)
                const participants = bill.bill_participants || [];
                if (participants.length > 0) {
                    // Convert participants to User format
                    const usersFromDB: User[] = participants.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        avatar: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
                        color: p.color || '#B54CFF',
                        initials: p.initials || p.name.slice(0, 2).toUpperCase(),
                    }));
                    setLoadedUsers(usersFromDB);

                    // Find my participant ID for guest restrictions
                    const myParticipant = participants.find((p: any) => p.user_id === user.id);
                    if (myParticipant) {
                        setMyParticipantId(myParticipant.id);
                        setSelectedUserId(myParticipant.id);
                    } else if (usersFromDB.length > 0) {
                        setSelectedUserId(usersFromDB[0].id);
                    }
                } else if (!isFromParty && details.users && details.users.length > 0) {
                    // Fallback: Load users from legacy details.users for backward compatibility
                    setLoadedUsers(details.users);
                    if (details.users.length > 0) {
                        setSelectedUserId(details.users[0].id);
                    }
                }

            } catch (err) {
                console.error('Error fetching bill data:', err);
            } finally {
                setIsLoadingDraft(false);
            }
        };

        fetchBillData();
    }, [isExistingDraft, isFromParty, id, user, session]);

    // Use loaded users if we fetched from draft or party
    const activeUsers = (isExistingDraft || isFromParty) ? loadedUsers : initialUsers;
    const activeScannedTip = isExistingDraft ? loadedScannedTip : scannedTip;

    // -- Derived Calculations --

    const subtotal = useMemo(() => items.reduce((sum: number, item: BillItem) => sum + (item.price || 0), 0), [items]);
    const billTotal = subtotal;

    // Calculate totals based on ASSIGNMENTS
    const userFinalTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        activeUsers.forEach(u => totals[u.id] = 0);

        Object.entries(assignments).forEach(([itemId, userIds]) => {
            const item = items.find(i => i.id === itemId);
            if (item && userIds && userIds.length > 0) {
                const splitFactor = userIds.length;
                const costPerUser = item.price / splitFactor;

                userIds.forEach(userId => {
                    if (totals[userId] !== undefined) {
                        totals[userId] += costPerUser;
                    }
                });
            }
        });

        return totals;
    }, [assignments, items, activeUsers]);

    // Remaining Amount Logic
    const { totalAssignedValue, remainingValue } = useMemo(() => {
        let assignedSum = 0;
        Object.values(userFinalTotals).forEach(val => assignedSum += val);

        let remaining = billTotal - assignedSum;
        if (Math.abs(remaining) < 0.01) {
            remaining = 0;
        }

        return {
            totalAssignedValue: assignedSum,
            remainingValue: remaining
        };
    }, [userFinalTotals, billTotal]);

    // Visual state for Remaining
    const remainingTextColor = useMemo(() => {
        if (remainingValue > 0.01) return '#6B7280';
        if (remainingValue > -0.01) return '#22C55E';
        return '#EF4444';
    }, [remainingValue]);

    // Progress Bar Segments
    const progressSegments = useMemo(() => {
        const segments: { width: number; color: string; id: string }[] = [];

        activeUsers.forEach(user => {
            const userTotal = userFinalTotals[user.id] || 0;
            if (userTotal > 0 && billTotal > 0) {
                const percentage = (userTotal / billTotal) * 100;
                segments.push({
                    id: user.id,
                    width: percentage,
                    color: user.color
                });
            }
        });

        return segments;
    }, [userFinalTotals, billTotal, activeUsers]);

    // -- CRUD Handlers --

    const handleAddItem = () => {
        const newItem = createEmptyItem();
        setItems(prev => [...prev, newItem]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleDeleteItem = (itemId: string) => {
        // Close any open swipeable
        swipeableRefs.current.get(itemId)?.close();

        setItems(prev => prev.filter(item => item.id !== itemId));
        setAssignments(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleUpdateItemName = (itemId: string, name: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, name } : item
        ));
    };

    const handleUpdateItemPrice = (itemId: string, priceText: string) => {
        // Store raw text to allow typing decimals (e.g., "12." before typing "47")
        const cleaned = priceText.replace(/[^0-9.]/g, '');
        setPriceInputs(prev => ({ ...prev, [itemId]: cleaned }));

        // Update numeric price for calculations (trailing decimal is treated as valid partial input)
        const price = parseFloat(cleaned) || 0;
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, price } : item
        ));
    };

    const handlePriceBlur = (itemId: string) => {
        // On blur, format the price properly and clear raw input
        const item = items.find(i => i.id === itemId);
        if (item) {
            setPriceInputs(prev => {
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
        }
    };

    // -- Assignment Handlers --

    const handleAssignItem = (itemId: string) => {
        setAssignments(prev => {
            const currentAssignees = prev[itemId] || [];
            let newAssignees: string[];

            if (currentAssignees.includes(selectedUserId)) {
                newAssignees = currentAssignees.filter(id => id !== selectedUserId);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else {
                newAssignees = [...currentAssignees, selectedUserId];
                Haptics.selectionAsync();
            }

            if (newAssignees.length === 0) {
                const newState = { ...prev };
                delete newState[itemId];
                return newState;
            }

            return { ...prev, [itemId]: newAssignees };
        });
    };

    const handleSelectUser = (userId: string) => {
        // Guests can only select themselves
        if (!isHost && myParticipantId && userId !== myParticipantId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (selectedUserId !== userId) {
            setSelectedUserId(userId);
            Haptics.selectionAsync();
        }
    };

    // -- Lazy Actions --

    const handleSplitEvenly = () => {
        const allUserIds = activeUsers.map(u => u.id);
        const newAssignments: Record<string, string[]> = {};
        items.forEach(item => {
            if (item.name || item.price > 0) { // Only assign non-empty items
                newAssignments[item.id] = [...allUserIds];
            }
        });
        setAssignments(newAssignments);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleRandomize = () => {
        const newAssignments: Record<string, string[]> = {};
        items.forEach(item => {
            if (item.name || item.price > 0) { // Only assign non-empty items
                const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
                newAssignments[item.id] = [randomUser.id];
            }
        });
        setAssignments(newAssignments);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // -- Navigation Handlers --

    const handleSaveAsDraft = async () => {
        // Prevent multiple saves
        if (isSaving) return;

        if (!user) {
            Alert.alert('Error', 'Please log in to save drafts.');
            return;
        }

        // Filter out completely empty items
        const validItems = items.filter(item => item.name.trim() || item.price > 0);

        if (validItems.length === 0) {
            Alert.alert('No Items', 'Add at least one item before saving.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // 1. Prepare the payload (Only send fields that exist in DB schema)
            const billPayload: any = {
                host_id: user.id,
                total_amount: subtotal,
                status: 'draft',
                details: {
                    items: validItems,
                    assignments: assignments,
                    scannedTip: activeScannedTip,
                }
            };

            // If existing draft, include the id for upsert
            if (isExistingDraft && id) {
                billPayload.id = id;
            }

            console.log('Saving Draft Payload:', { items: validItems, participants: activeUsers });

            // 2. Upsert the Bill (Create or Update in one move)
            const { data: savedBill, error: billError } = await supabase
                .from('bills')
                .upsert(billPayload)
                .select()
                .single();

            if (billError) {
                console.error('Bill save error:', billError);
                throw billError;
            }

            console.log('Bill saved successfully:', savedBill.id);

            // 3. Upsert Participants (Link people to the bill)
            const validParticipants = activeUsers.filter((p: any) => p.name && p.name.trim() !== '');

            if (validParticipants.length > 0) {
                const participantsPayload = validParticipants.map((p: any) => ({
                    bill_id: savedBill.id,
                    user_id: p.user_id || null, // Real user or null for guest
                    name: p.name,
                    is_guest: p.is_guest || false,
                    color: p.color,
                    initials: p.initials,
                }));

                console.log('Saving participants:', participantsPayload);

                const { error: partError } = await supabase
                    .from('bill_participants')
                    .upsert(participantsPayload, { onConflict: 'bill_id, name' });

                if (partError) {
                    console.error('Participants save error:', partError);
                    // Don't throw - bill is saved, participants failed
                }
            }

            Alert.alert(
                'Draft Saved!',
                'You can resume editing from the Home screen.',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
            );
        } catch (err: any) {
            console.error('Error saving draft:', err);
            Alert.alert('Error', err.message || 'Failed to save draft. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = () => {
        // Filter out empty items before proceeding
        const validItems = items.filter(item => item.name.trim() || item.price > 0);

        if (validItems.length === 0) {
            Alert.alert('No Items', 'Please add at least one item before continuing.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: '/bill/tip' as any,
            params: {
                billId: id, // Pass billId through the flow
                billData: JSON.stringify({
                    items: validItems,
                    subtotal: subtotal
                }),
                users: JSON.stringify(activeUsers),
                assignments: JSON.stringify(assignments),
                scannedTip: String(activeScannedTip)
            }
        });
    };

    // Show loading state while fetching draft data
    if (isLoadingDraft) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
                    <Stack.Screen options={{ headerShown: false }} />
                    <View className="items-center">
                        <View className="w-16 h-16 rounded-full bg-divvit-card items-center justify-center mb-4">
                            <Save size={28} color="#B54CFF" />
                        </View>
                        <Text className="text-divvit-text font-heading font-bold text-lg mb-2">Loading Draft...</Text>
                        <Text className="text-divvit-muted text-sm">Restoring your progress</Text>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 bg-white" edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Custom Header */}
                <View className="px-5 pt-2 pb-4">
                    <View className="flex-row items-center justify-between mb-4">
                        {/* Left: Back + Save as Draft */}
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="p-2 -ml-2 rounded-full border border-gray-200 bg-white"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 1,
                                }}
                            >
                                <ArrowLeft color="#111827" size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveAsDraft}
                                className="ml-3 flex-row items-center"
                            >
                                <Save size={16} color="#6B7280" />
                                <Text className="ml-1 text-divvit-muted font-medium text-sm">Draft</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Center: Title */}
                        <Text className="text-lg font-heading font-bold text-divvit-text">Edit Bill</Text>

                        {/* Right: Next */}
                        <TouchableOpacity
                            onPress={handleNext}
                            className="flex-row items-center bg-divvit-secondary px-4 py-2 rounded-full"
                            style={{
                                shadowColor: '#B54CFF',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <Text className="text-white font-heading font-bold text-sm mr-1">Next</Text>
                            <ArrowRight size={16} color="white" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Bill Summary Card */}
                    <View
                        className="flex-row justify-between items-end bg-white p-5 rounded-3xl border border-gray-100"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <View>
                            <Text className="text-divvit-muted font-body text-xs mb-1 uppercase tracking-wider">Subtotal</Text>
                            <Text className="text-3xl font-heading font-bold text-divvit-text">
                                ${subtotal.toFixed(2)}
                            </Text>
                        </View>

                        <View className="items-end">
                            <Text className="text-divvit-muted font-body text-xs mb-1 uppercase tracking-wider">Remaining</Text>
                            <AnimatedNumber
                                value={remainingValue}
                                className={`text-2xl font-heading font-bold p-0 m-0`}
                                style={{ color: remainingTextColor }}
                            />
                        </View>
                    </View>

                    {/* Multi-Colored Progress Bar */}
                    <View className="h-2 bg-gray-100 mt-4 rounded-full overflow-hidden w-full flex-row">
                        {progressSegments.map((segment) => (
                            <View
                                key={segment.id}
                                className="h-full"
                                style={{
                                    width: `${segment.width}%`,
                                    backgroundColor: segment.color
                                }}
                            />
                        ))}
                    </View>
                </View>

                {/* Editable Item List */}
                <KeyboardAwareScrollView
                    contentContainerStyle={{ paddingBottom: 280, paddingTop: 10 }}
                    showsVerticalScrollIndicator={false}
                    className="px-5"
                    extraScrollHeight={100}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid={true}
                >
                    {items.map((item, index) => {
                        const assignedUserIds = assignments[item.id] || [];
                        const isAssigned = assignedUserIds.length > 0;
                        const isMultiAssigned = assignedUserIds.length > 1;
                        const isSelectedUserAssigned = assignedUserIds.includes(selectedUserId);

                        return (
                            <Animated.View
                                key={item.id}
                                entering={FadeInDown.delay(index * 30).springify()}
                                layout={Layout.springify()}
                            >
                                <Swipeable
                                    ref={(ref) => {
                                        if (ref) swipeableRefs.current.set(item.id, ref);
                                    }}
                                    renderRightActions={() => (
                                        <RenderRightActions onDelete={() => handleDeleteItem(item.id)} />
                                    )}
                                    overshootRight={false}
                                    friction={2}
                                >
                                    <View
                                        className={`flex-row items-center p-4 mb-3 rounded-2xl border bg-white`}
                                        style={{
                                            borderColor: isSelectedUserAssigned
                                                ? activeUsers.find(u => u.id === selectedUserId)?.color
                                                : (isAssigned ? '#E5E7EB' : '#F3F4F6'),
                                            borderStyle: isMultiAssigned ? 'dashed' : 'solid',
                                            borderWidth: isSelectedUserAssigned ? 2 : 1,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.03,
                                            shadowRadius: 2,
                                            elevation: 1,
                                        }}
                                    >
                                        {/* Avatar Stack / Assign Button */}
                                        <TouchableOpacity
                                            onPress={() => handleAssignItem(item.id)}
                                            className="mr-3"
                                        >
                                            <View className="flex-row items-center h-10 w-10 relative">
                                                {!isAssigned && (
                                                    <View className="w-10 h-10 rounded-full items-center justify-center bg-gray-100 border border-dashed border-gray-300">
                                                        <Plus size={16} color="#9CA3AF" />
                                                    </View>
                                                )}

                                                {isAssigned && (
                                                    <View className="flex-row items-center">
                                                        {assignedUserIds.slice(0, 3).map((uid, idx) => {
                                                            const u = activeUsers.find(usr => usr.id === uid);
                                                            if (!u) return null;
                                                            return (
                                                                <View
                                                                    key={uid}
                                                                    className="w-8 h-8 rounded-full items-center justify-center border-2 border-white -ml-2 first:ml-0"
                                                                    style={{ backgroundColor: u.color, zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -8 }}
                                                                >
                                                                    <Text className="font-heading font-bold text-white text-[10px]">{u.initials}</Text>
                                                                </View>
                                                            )
                                                        })}
                                                        {assignedUserIds.length > 3 && (
                                                            <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-200 border-2 border-white" style={{ zIndex: 0, marginLeft: -8 }}>
                                                                <Text className="font-heading font-bold text-divvit-text text-[10px]">+{assignedUserIds.length - 3}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>

                                        {/* Name Input */}
                                        <View className="flex-1 mr-2">
                                            <TextInput
                                                value={item.name}
                                                onChangeText={(text) => handleUpdateItemName(item.id, text)}
                                                placeholder="Item name..."
                                                placeholderTextColor="#9CA3AF"
                                                className="font-medium text-base text-divvit-text py-1"
                                                returnKeyType="next"
                                            />
                                            {isMultiAssigned && (
                                                <Text className="text-[10px] text-divvit-muted uppercase tracking-wide">
                                                    Split {assignedUserIds.length} ways
                                                </Text>
                                            )}
                                        </View>

                                        {/* Price Input */}
                                        <View className="items-end">
                                            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2">
                                                <Text className="text-divvit-muted font-heading text-base mr-1">$</Text>
                                                <TextInput
                                                    value={priceInputs[item.id] !== undefined ? priceInputs[item.id] : (item.price > 0 ? item.price.toString() : '')}
                                                    onChangeText={(text) => handleUpdateItemPrice(item.id, text)}
                                                    onBlur={() => handlePriceBlur(item.id)}
                                                    placeholder="0.00"
                                                    placeholderTextColor="#9CA3AF"
                                                    keyboardType="decimal-pad"
                                                    className="font-heading text-base text-divvit-text min-w-[60px] text-right"
                                                    returnKeyType="done"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </Swipeable>
                            </Animated.View>
                        );
                    })}

                    {/* Add Item Button */}
                    <TouchableOpacity
                        onPress={handleAddItem}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-center p-4 mb-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50"
                    >
                        <Plus size={20} color="#6B7280" />
                        <Text className="ml-2 text-divvit-muted font-heading font-bold text-base">Add Item</Text>
                    </TouchableOpacity>

                    {/* Lazy Actions */}
                    <View className="flex-row justify-center mt-4 mb-6">
                        <TouchableOpacity
                            onPress={handleSplitEvenly}
                            activeOpacity={0.7}
                            className="flex-row items-center bg-gray-100 px-4 py-3 rounded-full mr-3"
                        >
                            <Users size={16} color="#6B7280" />
                            <Text className="ml-2 text-divvit-muted font-medium text-sm">Split Evenly</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleRandomize}
                            activeOpacity={0.7}
                            className="flex-row items-center bg-gray-100 px-4 py-3 rounded-full"
                        >
                            <Shuffle size={16} color="#6B7280" />
                            <Text className="ml-2 text-divvit-muted font-medium text-sm">Randomize</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>

                {/* Bottom Dock - User Selection */}
                <View
                    className="absolute bottom-0 left-0 right-0 bg-white pb-10 pt-6 border-t border-gray-200"
                    style={{
                        zIndex: 50,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 12,
                        elevation: 5,
                    }}
                >
                    <Text className="text-center text-divvit-muted text-[10px] font-heading uppercase tracking-[2px] mb-4">
                        Assigning as
                    </Text>
                    <Animated.ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minWidth: '100%' }}
                    >
                        {activeUsers.map((user) => (
                            <UserAvatar
                                key={user.id}
                                user={user}
                                isSelected={selectedUserId === user.id}
                                onPress={() => handleSelectUser(user.id)}
                                total={userFinalTotals[user.id]}
                            />
                        ))}
                    </Animated.ScrollView>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

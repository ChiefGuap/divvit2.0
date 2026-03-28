import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Keyboard, Modal } from 'react-native';
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
import { ArrowLeft, Check, ArrowRight, Plus, Trash2, Save, Shuffle, Users, X, Columns } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

import BillHeader from '../../components/bill/BillHeader';
import BillItemCard from '../../components/bill/BillItemCard';
import QuickActionsGrid from '../../components/bill/QuickActionsGrid';
import ParticipantSelector from '../../components/bill/ParticipantSelector';

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

export default function BillEditorScreen() {
    const router = useRouter();
    const { id, billData, users: usersParam, fromParty } = useLocalSearchParams<{ id: string; billData: string; users: string; fromParty: string }>();
    const { user, session } = useAuth();
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
    const channelRef = useRef<any>(null);

    // Debug logging for deep link verification
    console.log('BillEditor: Opened with ID:', id);
    console.log('BillEditor: fromParty:', fromParty);

    const isExistingDraft = id && id !== 'new' && id.length > 10;
    const isFromParty = fromParty === 'true';

    const initialUsers = useMemo(() => {
        if (usersParam) {
            try { return JSON.parse(usersParam) as User[]; } 
            catch (e) { console.error("Failed to parse usersParam", e); }
        }
        return [];
    }, [usersParam]);

    const { initialItems, scannedTip, scannedTax } = useMemo((): { initialItems: BillItem[]; scannedTip: number; scannedTax: number } => {
        if (billData) {
            try {
                const parsed = JSON.parse(billData);
                const rawItems = (parsed.items as any[]) || [];
                if (rawItems.length > 0) {
                    const itemsWithIds = rawItems.map((item: any) => ({
                        ...item,
                        id: item.id || Crypto.randomUUID(),
                        name: item.name || '',
                        price: Number(item.price) || 0
                    }));
                    return {
                        initialItems: itemsWithIds,
                        scannedTip: Number(parsed.scanned_tip) || Number(parsed.scannedTip) || 0,
                        scannedTax: Number(parsed.tax) || 0
                    };
                }
            } catch (e) { console.error("Failed to parse billData", e); }
        }
        return { initialItems: [createEmptyItem()], scannedTip: 0, scannedTax: 0 };
    }, [billData]);

    const [items, setItems] = useState<BillItem[]>(initialItems);
    const [selectedUserId, setSelectedUserId] = useState<string>(initialUsers[0]?.id ?? '');
    const [assignments, setAssignments] = useState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(isExistingDraft || isFromParty);
    const [loadedUsers, setLoadedUsers] = useState<User[]>(initialUsers);
    const [additionalUsers, setAdditionalUsers] = useState<User[]>([]);
    const [hasFetchedFromDB, setHasFetchedFromDB] = useState(false);
    const [loadedScannedTip, setLoadedScannedTip] = useState(scannedTip);
    const [hostId, setHostId] = useState<string | null>(null);
    const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
    const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
    const [taxAmount, setTaxAmount] = useState<number>(scannedTax);
    const [taxInput, setTaxInput] = useState<string>(scannedTax > 0 ? scannedTax.toFixed(2) : '');

    const [showCustomSplitModal, setShowCustomSplitModal] = useState(false);
    const [customPctInputs, setCustomPctInputs] = useState<Record<string, string>>({});

    const isHost = user?.id === hostId;

    useEffect(() => {
        if ((!isExistingDraft && !isFromParty) || !user || !session) return;
        if (hasFetchedFromDB) return;

        const fetchBillData = async () => {
            try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
                    setIsLoadingDraft(false);
                    return;
                }

                const data = await billResponse.json();
                if (!data || data.length === 0) {
                    setIsLoadingDraft(false);
                    return;
                }

                const bill = data[0];
                setHostId(bill.host_id);

                const itemsData = bill.items || bill.details?.items || [];
                if (itemsData.length > 0) {
                    const itemsWithIds = itemsData.map((item: any) => ({
                        ...item,
                        id: item.id || Crypto.randomUUID(),
                        name: item.name || '',
                        price: Number(item.price) || 0
                    }));
                    setItems(itemsWithIds);
                }

                const details = bill.details || {};
                if (details.assignments) setAssignments(details.assignments);

                const tipValue = bill.scanned_tip ?? details.scannedTip ?? 0;
                if (tipValue) setLoadedScannedTip(tipValue);

                const participants = bill.bill_participants || [];
                if (participants.length > 0) {
                    const usersFromDB = participants.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        avatar: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
                        color: p.color || '#B54CFF',
                        initials: p.initials || p.name.slice(0, 2).toUpperCase(),
                    }));
                    setLoadedUsers(usersFromDB);

                    const myParticipant = participants.find((p: any) => p.user_id === user.id);
                    if (myParticipant) {
                        setMyParticipantId(myParticipant.id);
                        setSelectedUserId(myParticipant.id);
                    } else if (usersFromDB.length > 0) {
                        setSelectedUserId(usersFromDB[0].id);
                    }
                } else if (!isFromParty && details.users && details.users.length > 0) {
                    setLoadedUsers(details.users);
                    if (details.users.length > 0) setSelectedUserId(details.users[0].id);
                }
            } catch (err) { } 
            finally {
                setIsLoadingDraft(false);
                setHasFetchedFromDB(true);
            }
        };

        fetchBillData();
    }, [isExistingDraft, isFromParty, id, user, session]);

    // Real-time assignment sync via Supabase broadcast (party mode only)
    useEffect(() => {
        if (!id || !isFromParty) return;

        const channel = supabase
            .channel(`bill-session-${id}`)
            .on('broadcast', { event: 'assignments-updated' }, ({ payload }) => {
                if (payload?.assignments) {
                    console.log('BillEditor: Received remote assignment update');
                    setAssignments(payload.assignments);
                }
            })
            .subscribe((status) => {
                console.log('BillEditor: Broadcast channel status', status);
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [id, isFromParty]);

    const activeUsers = [
        ...((isExistingDraft || isFromParty) ? loadedUsers : initialUsers),
        ...additionalUsers,
    ];
    const activeScannedTip = isExistingDraft ? loadedScannedTip : scannedTip;

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.price || 0), 0), [items]);
    const billTotal = subtotal + taxAmount;

    const userFinalTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        activeUsers.forEach(u => totals[u.id] = 0);

        Object.entries(assignments).forEach(([itemId, userIds]) => {
            const item = items.find(i => i.id === itemId);
            if (item && userIds && userIds.length > 0) {
                const costPerUser = item.price / userIds.length;
                userIds.forEach(userId => {
                    if (totals[userId] !== undefined) totals[userId] += costPerUser;
                });
            }
        });

        if (taxAmount > 0 && subtotal > 0) {
            activeUsers.forEach(u => {
                const userTaxShare = (totals[u.id] / subtotal) * taxAmount;
                totals[u.id] += userTaxShare;
            });
        }
        return totals;
    }, [assignments, items, activeUsers, taxAmount, subtotal]);

    const progressSegments = useMemo(() => {
        const segments: { width: number; color: string; id: string }[] = [];
        activeUsers.forEach(u => {
            const userTotal = userFinalTotals[u.id] || 0;
            if (userTotal > 0 && billTotal > 0) {
                segments.push({ id: u.id, width: (userTotal / billTotal) * 100, color: u.color });
            }
        });
        return segments;
    }, [userFinalTotals, billTotal, activeUsers]);

    const handleAddItem = () => {
        setItems(prev => [...prev, createEmptyItem()]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleDeleteItem = (itemId: string) => {
        swipeableRefs.current.get(itemId)?.close();
        setItems(prev => prev.filter(item => item.id !== itemId));
        setAssignments(prev => { const next = { ...prev }; delete next[itemId]; return next; });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleUpdateItemName = (itemId: string, name: string) => {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, name } : item));
    };

    const handleUpdateItemPrice = (itemId: string, priceText: string) => {
        const cleaned = priceText.replace(/[^0-9.]/g, '');
        setPriceInputs(prev => ({ ...prev, [itemId]: cleaned }));
        const price = parseFloat(cleaned) || 0;
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, price } : item));
    };

    const handlePriceBlur = (itemId: string) => {
        setPriceInputs(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    };

    const handleAssignItem = (itemId: string) => {
        if (!selectedUserId) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }

        // Compute the new assignments eagerly (not inside the updater) so we can broadcast them
        const currentAssignees = assignments[itemId] || [];
        let newAssignees: string[];
        if (currentAssignees.includes(selectedUserId)) {
            newAssignees = currentAssignees.filter(uid => uid !== selectedUserId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            newAssignees = [...currentAssignees, selectedUserId];
            Haptics.selectionAsync();
        }

        const newAssignments: Record<string, string[]> =
            newAssignees.length === 0
                ? (() => { const n = { ...assignments }; delete n[itemId]; return n; })()
                : { ...assignments, [itemId]: newAssignees };

        setAssignments(newAssignments);

        // Broadcast the full updated assignments to all other participants in real time
        if (isFromParty && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'assignments-updated',
                payload: { assignments: newAssignments },
            });
        }
    };

    const handleSelectUser = (userId: string) => {
        if (!isHost && myParticipantId && userId !== myParticipantId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (selectedUserId !== userId) {
            setSelectedUserId(userId);
            Haptics.selectionAsync();
        }
    };

    const AVATAR_COLORS = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65'];

    const handleAddUser = () => {
        Alert.prompt(
            'Add Person',
            'Enter their name',
            (name) => {
                if (!name || !name.trim()) return;
                const trimmed = name.trim();
                const initials = trimmed.slice(0, 2).toUpperCase();
                const colorIndex = (additionalUsers.length + activeUsers.length) % AVATAR_COLORS.length;
                const newUser: User = {
                    id: Crypto.randomUUID(),
                    name: trimmed,
                    avatar: '',
                    color: AVATAR_COLORS[colorIndex],
                    initials,
                };
                setAdditionalUsers(prev => [...prev, newUser]);
            },
            'plain-text',
        );
    };

    const handleSplitOptions = () => {
        Alert.alert(
            'Split Options',
            'Choose a way to split the bill',
            [
                { text: 'Split Evenly', onPress: handleSplitEvenly },
                {
                    text: 'Custom Percentages', onPress: () => {
                        const initialInputs: Record<string, string> = {};
                        activeUsers.forEach(u => initialInputs[u.id] = '');
                        setCustomPctInputs(initialInputs);
                        setShowCustomSplitModal(true);
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleSplitEvenly = () => {
        const allUserIds = activeUsers.map(u => u.id);
        const newAssignments: Record<string, string[]> = {};
        items.forEach(item => {
            if (item.name || item.price > 0) newAssignments[item.id] = [...allUserIds];
        });
        setAssignments(newAssignments);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleRandomize = () => {
        const newAssignments: Record<string, string[]> = {};
        items.forEach(item => {
            if (item.name || item.price > 0) {
                const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
                newAssignments[item.id] = [randomUser.id];
            }
        });
        setAssignments(newAssignments);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleClearAssignments = () => {
        setAssignments({});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleApplyCustomSplit = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newAssignments: Record<string, string[]> = {};
        const proportionalShares: string[] = [];
        activeUsers.forEach(u => {
            const pct = parseFloat(customPctInputs[u.id]) || 0;
            const shares = Math.round(pct * 10);
            for (let i = 0; i < shares; i++) proportionalShares.push(u.id);
        });
        items.forEach(item => {
            if (item.name || item.price > 0) {
                if (proportionalShares.length > 0) newAssignments[item.id] = [...proportionalShares];
            }
        });
        setAssignments(newAssignments);
        setShowCustomSplitModal(false);
    };

    const handleSaveAsDraft = async () => {
        if (isSaving) return;
        if (!user) { Alert.alert('Error', 'Please log in to save drafts.'); return; }
        const validItems = items.filter(item => item.name.trim() || item.price > 0);
        if (validItems.length === 0) { Alert.alert('No Items', 'Add at least one item before saving.'); return; }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const billPayload: any = {
                host_id: user.id,
                total_amount: subtotal,
                status: 'draft',
                details: { items: validItems, assignments, scannedTip: activeScannedTip }
            };
            if (isExistingDraft && id) billPayload.id = id;

            const { data: savedBill, error: billError } = await supabase.from('bills').upsert(billPayload).select().single();
            if (billError) throw billError;

            const validParticipants = activeUsers.filter((p: any) => p.name && p.name.trim() !== '');
            if (validParticipants.length > 0) {
                const participantsPayload = validParticipants.map((p: any) => ({
                    bill_id: savedBill.id, user_id: p.user_id || null, name: p.name,
                    is_guest: p.is_guest || false, color: p.color, initials: p.initials,
                }));
                const { error: partError } = await supabase.from('bill_participants').upsert(participantsPayload, { onConflict: 'bill_id, name' });
            }

            Alert.alert('Draft Saved!', 'You can resume editing from the Home screen.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save draft. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = () => {
        const validItems = items.filter(item => item.name.trim() || item.price > 0);
        if (validItems.length === 0) { Alert.alert('No Items', 'Please add at least one item before continuing.'); return; }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: '/bill/tip' as any,
            params: {
                billId: id,
                billData: JSON.stringify({ items: validItems, subtotal, tax: taxAmount }),
                users: JSON.stringify(activeUsers),
                assignments: JSON.stringify(assignments),
                scannedTip: String(activeScannedTip)
            }
        });
    };

    if (isLoadingDraft) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
                    <Stack.Screen options={{ headerShown: false }} />
                    <View className="items-center">
                        <View className="w-16 h-16 rounded-full bg-primary-container items-center justify-center mb-4">
                            <Save size={28} color="#ffffff" />
                        </View>
                        <Text className="text-on-surface font-heading font-bold text-lg mb-2">Loading Draft...</Text>
                        <Text className="text-on-surface-variant text-sm">Restoring your progress</Text>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Top Navigation */}
                <View className="flex-row items-center justify-between px-6 h-16 w-full">
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors">
                            <ArrowLeft color="#4b29b4" size={24} />
                        </TouchableOpacity>
                        <Text className="text-2xl font-black text-primary tracking-tight">Divvit</Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                        <View className="px-3 py-1 rounded-full bg-surface-container-high">
                            <Text className="text-primary text-[10px] font-bold uppercase tracking-widest">Draft</Text>
                        </View>
                        <TouchableOpacity onPress={handleSaveAsDraft} className="p-2 -mr-2 rounded-full active:bg-gray-100 transition-colors">
                            <Save color="#6346cd" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content Area */}
                <KeyboardAwareScrollView
                    contentContainerStyle={{ paddingBottom: 150, paddingTop: 10, paddingHorizontal: 24 }}
                    showsVerticalScrollIndicator={false}
                    className="flex-1 max-w-2xl mx-auto w-full"
                    extraScrollHeight={100}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid={true}
                >
                    <BillHeader 
                        subtotal={subtotal} 
                        taxAmount={taxAmount} 
                        taxInput={taxInput} 
                        setTaxInput={setTaxInput} 
                        setTaxAmount={setTaxAmount} 
                        billTotal={billTotal} 
                        progressSegments={progressSegments} 
                    />

                    {/* Items Bento Grid */}
                    <View className="flex-col gap-4">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold tracking-tight text-on-surface ml-1 flex-1 flex-shrink">Bill Items</Text>
                            <TouchableOpacity onPress={handleAddItem} className="flex-row items-center gap-1">
                                <Plus color="#4b29b4" size={16} />
                                <Text className="text-primary font-bold text-sm">Add Item</Text>
                            </TouchableOpacity>
                        </View>

                        {items.map((item, index) => {
                            const assignedUserIds = assignments[item.id] || [];
                            const uniqueAssignees = Array.from(new Set(assignedUserIds));

                            return (
                                <BillItemCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    priceInput={priceInputs[item.id]}
                                    uniqueAssignees={uniqueAssignees}
                                    activeUsers={activeUsers}
                                    onNameChange={(text) => handleUpdateItemName(item.id, text)}
                                    onPriceChange={(text) => handleUpdateItemPrice(item.id, text)}
                                    onPriceBlur={() => handlePriceBlur(item.id)}
                                    onAssignToggle={() => handleAssignItem(item.id)}
                                    onDelete={() => handleDeleteItem(item.id)}
                                    setSwipeableRef={(ref) => {
                                        if (ref) swipeableRefs.current.set(item.id, ref);
                                    }}
                                />
                            );
                        })}

                        {/* Placeholder for New Item */}
                        <TouchableOpacity
                            onPress={handleAddItem}
                            activeOpacity={0.7}
                            className="border-2 border-dashed border-outline-variant/50 p-5 rounded-xl flex items-center justify-center bg-gray-50/50 mt-1 mb-4"
                        >
                            <View className="items-center gap-1">
                                <Plus color="#9CA3AF" size={24} />
                                <Text className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Draft next item</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <QuickActionsGrid 
                        onSplitEvenly={handleSplitOptions}
                        onRandomize={handleRandomize}
                        onClear={handleClearAssignments}
                    />

                    <ParticipantSelector
                        activeUsers={activeUsers}
                        selectedUserId={selectedUserId}
                        onSelectUser={handleSelectUser}
                        onAddUser={handleAddUser}
                    />

                </KeyboardAwareScrollView>

                {/* Floating Save Button */}
                <View className="absolute bottom-6 right-6 z-50">
                    <TouchableOpacity 
                        onPress={handleNext}
                        activeOpacity={0.8}
                        className="bg-primary h-16 w-16 rounded-full flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 transition-all"
                    >
                        <Check color="white" size={32} />
                    </TouchableOpacity>
                </View>

                {/* Custom Split Modal */}
                <Modal
                    visible={showCustomSplitModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowCustomSplitModal(false)}
                >
                    <View className="flex-1 justify-end bg-black/40">
                        <KeyboardAwareScrollView 
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                            showsVerticalScrollIndicator={false}
                            enableOnAndroid={true}
                        >
                            <View className="bg-white rounded-t-3xl pb-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 }}>
                                <View className="flex-row items-center justify-between px-5 py-5 border-b border-gray-100">
                                    <View className="flex-1 mr-4">
                                        <Text className="font-heading text-xl font-bold text-on-surface">Custom Split</Text>
                                        <Text className="text-sm text-on-surface-variant font-body mt-1">Enter percentages for each person</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowCustomSplitModal(false)} className="p-2 rounded-full bg-gray-100">
                                        <X size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View className="px-5 pt-4 max-h-[300px]">
                                    {activeUsers.map(u => (
                                        <View key={u.id} className="flex-row items-center justify-between mb-4">
                                            <View className="flex-row items-center flex-1">
                                                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: u.color }}>
                                                    <Text className="font-heading font-bold text-white text-sm">{u.initials}</Text>
                                                </View>
                                                <Text className="font-heading font-bold text-on-surface text-base">{u.name}</Text>
                                            </View>
                                            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                                <TextInput
                                                    value={customPctInputs[u.id]}
                                                    onChangeText={(val) => {
                                                        const cleaned = val.replace(/[^0-9.]/g, '');
                                                        setCustomPctInputs(prev => ({ ...prev, [u.id]: cleaned }));
                                                    }}
                                                    placeholder="0"
                                                    placeholderTextColor="#9CA3AF"
                                                    keyboardType="decimal-pad"
                                                    className="font-heading text-lg text-on-surface min-w-[40px] text-right"
                                                />
                                                <Text className="font-heading text-lg text-on-surface-variant ml-1">%</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Progress Bar & Apply */}
                                {(() => {
                                    let sumPcts = 0;
                                    Object.values(customPctInputs).forEach(v => sumPcts += parseFloat(v) || 0);
                                    const sumRounded = Math.round(sumPcts * 10) / 10;
                                    const isValid = sumRounded === 100;
                                    const isUnder = sumRounded < 100;

                                    return (
                                        <View className="px-5 pt-6 pb-4 border-t border-gray-100">
                                            <View className="flex-row justify-between mb-2">
                                                <Text className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">Total Allocated</Text>
                                                <Text className={`text-xs font-bold leading-none ${isValid ? 'text-green-500' : (isUnder ? 'text-amber-500' : 'text-error')}`}>
                                                    {sumRounded.toFixed(1)}% / 100%
                                                </Text>
                                            </View>
                                            
                                            <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                                                <View 
                                                    className={`h-full ${isValid ? 'bg-green-500' : (isUnder ? 'bg-amber-500' : 'bg-error')}`}
                                                    style={{ width: `${Math.min(sumRounded, 100)}%` }}
                                                />
                                            </View>

                                            <TouchableOpacity
                                                onPress={handleApplyCustomSplit}
                                                disabled={!isValid}
                                                activeOpacity={0.8}
                                                className={`py-4 rounded-2xl items-center justify-center flex-row ${isValid ? 'bg-primary' : 'bg-gray-200'}`}
                                            >
                                                <Text className={`font-heading font-bold text-lg mr-2 ${isValid ? 'text-white' : 'text-gray-400'}`}>
                                                    Confirm Percentages
                                                </Text>
                                                {isValid && <Check size={20} color="white" strokeWidth={3} />}
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })()}
                            </View>
                        </KeyboardAwareScrollView>
                    </View>
                </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

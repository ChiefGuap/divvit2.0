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
import {
    getBillItems,
    createBillItems,
    updateBillItem,
    deleteBillItem,
    assignItem,
    subscribeToBillItems,
    subscribeToBillStatus,
    subscribeToParticipants,
    updateBillStatus,
    unsubscribeAll,
} from '../../services/billService';
import { BillItem as SyncBillItem, BillStatus } from '../../types';

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
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialUsers[0]?.id ? [initialUsers[0].id] : []);
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

                const taxValue = Number(details.tax) || 0;
                if (taxValue) {
                    setTaxAmount(taxValue);
                    setTaxInput(taxValue.toFixed(2));
                }

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
                        setSelectedUserIds([myParticipant.id]);
                    } else if (usersFromDB.length > 0) {
                        setSelectedUserIds([usersFromDB[0].id]);
                    }
                } else if (!isFromParty && details.users && details.users.length > 0) {
                    setLoadedUsers(details.users);
                    if (details.users.length > 0) setSelectedUserIds([details.users[0].id]);
                }
            } catch (err: any) {
                console.error('BillEditor: fetchBillData error:', err?.message || err);
            } finally {
                setIsLoadingDraft(false);
                setHasFetchedFromDB(true);
            }
        };

        fetchBillData();
    }, [isExistingDraft, isFromParty, id, user, session]);

    // ─── Realtime sync for party mode (postgres_changes on bill_items + bill status) ───
    // Replaces old broadcast-based sync with database-backed realtime subscriptions
    const [syncItems, setSyncItems] = useState<SyncBillItem[]>([]);
    const [hasFetchedSyncItems, setHasFetchedSyncItems] = useState(false);

    useEffect(() => {
        if (!id || !isFromParty) return;

        // Fetch bill_items from table on mount
        const loadSyncItems = async () => {
            try {
                const items = await getBillItems(id);
                setSyncItems(items);
                console.log('BillEditor: Loaded', items.length, 'bill_items from DB');
            } catch (err) {
                console.error('BillEditor: Failed to load bill_items:', err);
            } finally {
                setHasFetchedSyncItems(true);
            }
        };
        loadSyncItems();

        // Subscribe to bill_items changes (assignments, new items)
        const itemsChannel = subscribeToBillItems(id, (updatedItem) => {
            setSyncItems(prev => {
                const exists = prev.find(i => i.id === updatedItem.id);
                if (exists) {
                    return prev.map(i => i.id === updatedItem.id ? updatedItem : i);
                }
                return [...prev, updatedItem];
            });
        });

        // Subscribe to bill status changes (tip_selection, completed, settled)
        const statusChannel = subscribeToBillStatus(id, (newStatus) => {
            if (newStatus === 'tip_selection') {
                router.replace({
                    pathname: '/bill/tip' as any,
                    params: { billId: id, fromParty: 'true' },
                });
            }
        });

        // Subscribe to new participants joining
        const participantsChannel = subscribeToParticipants(id, (newParticipant) => {
            setLoadedUsers(prev => {
                if (prev.find(u => u.id === newParticipant.id)) return prev;
                return [...prev, {
                    id: newParticipant.id,
                    name: newParticipant.name,
                    avatar: newParticipant.avatar_url || `https://i.pravatar.cc/150?u=${newParticipant.id}`,
                    color: newParticipant.color || '#B54CFF',
                    initials: newParticipant.initials || newParticipant.name.slice(0, 2).toUpperCase(),
                }];
            });
        });

        return () => {
            unsubscribeAll([itemsChannel, statusChannel, participantsChannel]);
        };
    }, [id, isFromParty]);

    // When host is in party mode, sync bill_items into local items state
    // so the standalone UI (multi-assignment, quick actions) works
    useEffect(() => {
        if (!isFromParty || !isHost || !hasFetchedSyncItems || syncItems.length === 0) return;
        // Only seed local items once (when first loaded from DB)
        if (items.length > 1 || (items.length === 1 && items[0].name !== '')) return;
        setItems(syncItems.map(si => ({ id: si.id, name: si.name, price: si.price })));
    }, [isFromParty, isHost, hasFetchedSyncItems, syncItems]);

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

    // ─── Party mode (GUEST only): single-assignment item claiming via bill_items table ───
    // Host uses the multi-assign local state path instead (see handleAssignItem).
    const handleSyncAssignItem = async (itemId: string) => {
        const targetParticipantId = myParticipantId;

        if (!targetParticipantId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const item = syncItems.find(i => i.id === itemId);
        if (!item) return;

        // Guests can't claim items already assigned to someone else
        if (item.assigned_to && item.assigned_to !== targetParticipantId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const isTargetItem = item.assigned_to === targetParticipantId;
        const newAssignment = isTargetItem ? null : targetParticipantId;

        // Optimistic update
        setSyncItems(prev => prev.map(i =>
            i.id === itemId ? { ...i, assigned_to: newAssignment } : i
        ));
        Haptics.selectionAsync();

        // Persist to Supabase (triggers realtime for others)
        try {
            await assignItem(itemId, newAssignment);
        } catch (error) {
            // Revert optimistic update on failure
            setSyncItems(prev => prev.map(i =>
                i.id === itemId ? { ...i, assigned_to: item.assigned_to } : i
            ));
            console.error('BillEditor: Failed to assign item:', error);
            Alert.alert('Error', 'Failed to assign item. Try again.');
        }
    };

    // ─── Party mode: host can add, edit, and delete items via bill_items table ───
    const handleSyncAddItem = async () => {
        if (!isHost || !id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const created = await createBillItems(id, [{ name: '', price: 0, quantity: 1 }]);
            if (created.length > 0) {
                setSyncItems(prev => [...prev, created[0]]);
            }
        } catch (err) {
            console.error('BillEditor: Failed to add item:', err);
            Alert.alert('Error', 'Failed to add item.');
        }
    };

    const syncNameTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const syncPriceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const handleSyncUpdateName = (itemId: string, name: string) => {
        // Optimistic update
        setSyncItems(prev => prev.map(i => i.id === itemId ? { ...i, name } : i));
        // Debounce the DB write
        const existing = syncNameTimers.current.get(itemId);
        if (existing) clearTimeout(existing);
        syncNameTimers.current.set(itemId, setTimeout(async () => {
            try { await updateBillItem(itemId, { name }); }
            catch (err) { console.error('BillEditor: Failed to update item name:', err); }
        }, 500));
    };

    const handleSyncUpdatePrice = (itemId: string, priceText: string) => {
        const cleaned = priceText.replace(/[^0-9.]/g, '');
        setPriceInputs(prev => ({ ...prev, [itemId]: cleaned }));
        const price = parseFloat(cleaned) || 0;
        setSyncItems(prev => prev.map(i => i.id === itemId ? { ...i, price } : i));
        // Debounce the DB write
        const existing = syncPriceTimers.current.get(itemId);
        if (existing) clearTimeout(existing);
        syncPriceTimers.current.set(itemId, setTimeout(async () => {
            try { await updateBillItem(itemId, { price }); }
            catch (err) { console.error('BillEditor: Failed to update item price:', err); }
        }, 500));
    };

    const handleSyncPriceBlur = (itemId: string) => {
        setPriceInputs(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    };

    const handleSyncDeleteItem = async (itemId: string) => {
        if (!isHost) return;
        const prevItems = syncItems;
        setSyncItems(prev => prev.filter(i => i.id !== itemId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
            await deleteBillItem(itemId);
        } catch (err) {
            setSyncItems(prevItems);
            console.error('BillEditor: Failed to delete item:', err);
            Alert.alert('Error', 'Failed to delete item.');
        }
    };

    // Host action: Continue to Tip screen (sets bill status to tip_selection)
    // Syncs local items + assignments to Supabase before transitioning
    const handleContinueToTip = async () => {
        if (!isHost || !id) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const validItems = items.filter(item => item.name.trim() || item.price > 0);
        if (validItems.length === 0) {
            Alert.alert('No Items', 'Please add at least one item before continuing.');
            return;
        }

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Delete existing bill_items and re-create from local state
            await fetch(`${supabaseUrl}/rest/v1/bill_items?bill_id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session!.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            const itemsPayload = validItems.map(item => ({
                bill_id: id,
                name: item.name,
                price: Number(item.price) || 0,
                quantity: 1,
            }));
            await fetch(`${supabaseUrl}/rest/v1/bill_items`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session!.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify(itemsPayload),
            });

            // Save assignments + tax to bill details JSONB
            await fetch(`${supabaseUrl}/rest/v1/bills?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey!,
                    'Authorization': `Bearer ${session!.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                    details: {
                        items: validItems,
                        assignments,
                        users: activeUsers,
                        tax: taxAmount,
                        subtotal,
                    },
                }),
            });

            await updateBillStatus(id, 'tip_selection');
            // Host navigates immediately; guests navigate via realtime subscription
            router.push({
                pathname: '/bill/tip' as any,
                params: { billId: id, fromParty: 'true' },
            });
        } catch (err) {
            console.error('BillEditor: Failed to update status to tip_selection:', err);
            Alert.alert('Error', 'Failed to continue. Please try again.');
        }
    };

    // ─── Multi-assignment via local state (works in standalone AND party-host mode) ───
    const handleAssignItem = (itemId: string) => {
        // In party mode, guests use the single-assign sync path; host uses multi-assign local state
        if (isFromParty && !isHost) {
            handleSyncAssignItem(itemId);
            return;
        }

        if (selectedUserIds.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const currentAssignees = assignments[itemId] || [];
        // If ALL selected users are already assigned → remove them. Otherwise → add them (union).
        const allAlreadyAssigned = selectedUserIds.every(uid => currentAssignees.includes(uid));

        let newAssignees: string[];
        if (allAlreadyAssigned) {
            newAssignees = currentAssignees.filter(uid => !selectedUserIds.includes(uid));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            newAssignees = Array.from(new Set([...currentAssignees, ...selectedUserIds]));
            Haptics.selectionAsync();
        }

        const newAssignments: Record<string, string[]> =
            newAssignees.length === 0
                ? (() => { const n = { ...assignments }; delete n[itemId]; return n; })()
                : { ...assignments, [itemId]: newAssignees };

        setAssignments(newAssignments);
    };

    const handleSelectUser = (userId: string) => {
        // Guests can only select themselves
        if (!isHost && myParticipantId && userId !== myParticipantId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        setSelectedUserIds(prev => {
            if (prev.includes(userId)) {
                // Don't allow deselecting the last user — keep at least one selected for guest
                if (!isHost && prev.length === 1) return prev;
                return prev.filter(uid => uid !== userId);
            }
            return [...prev, userId];
        });
        Haptics.selectionAsync();
    };

    const AVATAR_COLORS = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65'];

    const handleAddUser = () => {
        Alert.prompt(
            'Add Person',
            'Enter their name',
            async (name) => {
                if (!name || !name.trim()) return;
                const trimmed = name.trim();
                const initials = trimmed.slice(0, 2).toUpperCase();
                const colorIndex = (additionalUsers.length + activeUsers.length) % AVATAR_COLORS.length;
                const color = AVATAR_COLORS[colorIndex];

                // If the bill exists in DB (party mode or existing draft), persist to bill_participants
                // so the added user survives through tip/checkout screens.
                const billExistsInDb = (isFromParty || isExistingDraft) && id && id !== 'new' && session;
                if (billExistsInDb) {
                    try {
                        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                        const response = await fetch(
                            `${supabaseUrl}/rest/v1/bill_participants`,
                            {
                                method: 'POST',
                                headers: {
                                    'apikey': supabaseKey!,
                                    'Authorization': `Bearer ${session!.access_token}`,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=representation',
                                },
                                body: JSON.stringify({
                                    bill_id: id,
                                    user_id: null,
                                    name: trimmed,
                                    is_guest: true,
                                    color,
                                    initials,
                                }),
                            }
                        );
                        if (!response.ok) {
                            const errText = await response.text();
                            console.error('BillEditor: Failed to insert bill_participant:', errText);
                            Alert.alert('Error', 'Failed to add person. Please try again.');
                            return;
                        }
                        const inserted = await response.json();
                        const dbRow = inserted[0];
                        const newUser: User = {
                            id: dbRow.id,
                            name: dbRow.name,
                            avatar: dbRow.avatar_url || '',
                            color: dbRow.color,
                            initials: dbRow.initials,
                        };
                        // Add to loadedUsers (party/existing draft uses loadedUsers), not additionalUsers —
                        // realtime subscription may also deliver this, so loadedUsers dedupes by id.
                        setLoadedUsers(prev => {
                            if (prev.some(u => u.id === newUser.id)) return prev;
                            return [...prev, newUser];
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (err) {
                        console.error('BillEditor: Error adding participant:', err);
                        Alert.alert('Error', 'Failed to add person. Please try again.');
                    }
                    return;
                }

                // Standalone pure mode (no DB yet): add to local state only.
                // handleSaveAsDraft upserts these into bill_participants on save.
                const newUser: User = {
                    id: Crypto.randomUUID(),
                    name: trimmed,
                    avatar: '',
                    color,
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
                            {(!isFromParty || isHost) && (
                                <TouchableOpacity onPress={isFromParty ? handleSyncAddItem : handleAddItem} className="flex-row items-center gap-1">
                                    <Plus color="#4b29b4" size={16} />
                                    <Text className="text-primary font-bold text-sm">Add Item</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isFromParty && !isHost ? (
                            /* ── Party mode (guest): render from bill_items table with single-assignment ── */
                            syncItems.length > 0 ? syncItems.map((syncItem, index) => {
                                const assigneeId = syncItem.assigned_to;
                                const uniqueAssignees = assigneeId ? [assigneeId] : [];

                                return (
                                    <BillItemCard
                                        key={syncItem.id}
                                        item={{ id: syncItem.id, name: syncItem.name, price: syncItem.price }}
                                        index={index}
                                        priceInput={undefined as any}
                                        uniqueAssignees={uniqueAssignees}
                                        activeUsers={activeUsers}
                                        onNameChange={() => {}}
                                        onPriceChange={() => {}}
                                        onPriceBlur={() => {}}
                                        onAssignToggle={() => handleAssignItem(syncItem.id)}
                                        onDelete={() => {}}
                                        setSwipeableRef={() => {}}
                                    />
                                );
                            }) : (
                                <View className="items-center py-8">
                                    <Text className="text-on-surface-variant font-medium text-sm">
                                        Waiting for host to add items...
                                    </Text>
                                </View>
                            )
                        ) : (
                            /* ── Host (party or standalone): full editing with multi-assignment ── */
                            items.map((item, index) => {
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
                            })
                        )}

                        {/* Placeholder for New Item */}
                        {(!isFromParty || isHost) && (
                            <TouchableOpacity
                                onPress={isFromParty ? handleSyncAddItem : handleAddItem}
                                activeOpacity={0.7}
                                className="border-2 border-dashed border-outline-variant/50 p-5 rounded-xl flex items-center justify-center bg-gray-50/50 mt-1 mb-4"
                            >
                                <View className="items-center gap-1">
                                    <Plus color="#9CA3AF" size={24} />
                                    <Text className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Draft next item</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    {(!isFromParty || isHost) && (
                        <QuickActionsGrid
                            onSplitEvenly={handleSplitOptions}
                            onRandomize={handleRandomize}
                            onClear={handleClearAssignments}
                        />
                    )}

                    <ParticipantSelector
                        activeUsers={activeUsers}
                        selectedUserIds={selectedUserIds}
                        onSelectUser={handleSelectUser}
                        onAddUser={(!isFromParty || isHost) ? handleAddUser : undefined}
                    />

                </KeyboardAwareScrollView>

                {/* Floating Action Button */}
                {isFromParty && isHost ? (
                    /* Host in party mode: "Continue to Tip" button */
                    <View className="absolute bottom-6 left-6 right-6 z-50">
                        <TouchableOpacity
                            onPress={handleContinueToTip}
                            activeOpacity={0.8}
                            className="bg-primary h-14 rounded-full flex-row items-center justify-center shadow-xl shadow-primary/20"
                        >
                            <Text className="text-white font-bold text-base mr-2">Continue to Tip</Text>
                            <ArrowRight color="white" size={20} />
                        </TouchableOpacity>
                    </View>
                ) : !isFromParty ? (
                    /* Standalone mode: next button */
                    <View className="absolute bottom-6 right-6 z-50">
                        <TouchableOpacity
                            onPress={handleNext}
                            activeOpacity={0.8}
                            className="bg-primary h-16 w-16 rounded-full flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 transition-all"
                        >
                            <Check color="white" size={32} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Guest in party mode: waiting indicator */
                    <View className="absolute bottom-6 left-6 right-6 z-50">
                        <View
                            className="h-14 rounded-full flex-row items-center justify-center"
                            style={{ backgroundColor: '#f1f3ff', borderWidth: 1, borderColor: 'rgba(202,196,214,0.3)' }}
                        >
                            <Users color="#6346cd" size={18} />
                            <Text className="text-on-surface-variant font-medium text-sm ml-2">
                                Claim your items — host will continue when ready
                            </Text>
                        </View>
                    </View>
                )}

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

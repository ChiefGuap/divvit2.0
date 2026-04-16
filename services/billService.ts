import { supabase } from '../lib/supabase';
import { BillItem, BillStatus, Participant, PaymentRequest } from '../types';

// ─── BILL OPERATIONS ────────────────────────────────────────────────────────

export const getBill = async (billId: string) => {
    const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();
    if (error) throw error;
    return data;
};

export const updateBillStatus = async (billId: string, status: BillStatus) => {
    const { data, error } = await supabase
        .from('bills')
        .update({ status })
        .eq('id', billId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateBillTip = async (billId: string, tip: number) => {
    // tip is stored inside the details JSONB column, not a top-level column
    const { data: existing } = await supabase
        .from('bills')
        .select('details')
        .eq('id', billId)
        .single();
    const details = (existing?.details as Record<string, any>) || {};
    const { data, error } = await supabase
        .from('bills')
        .update({ details: { ...details, tip } })
        .eq('id', billId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

// ─── BILL ITEMS OPERATIONS ──────────────────────────────────────────────────

export const getBillItems = async (billId: string): Promise<BillItem[]> => {
    const { data, error } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as BillItem[];
};

export const createBillItems = async (
    billId: string,
    items: Array<{ name: string; price: number; quantity?: number }>
): Promise<BillItem[]> => {
    const payload = items.map(item => ({
        bill_id: billId,
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
    }));

    const { data, error } = await supabase
        .from('bill_items')
        .insert(payload)
        .select();
    if (error) throw error;
    return (data || []) as BillItem[];
};

export const updateBillItem = async (
    itemId: string,
    updates: { name?: string; price?: number }
): Promise<BillItem> => {
    const { data, error } = await supabase
        .from('bill_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();
    if (error) throw error;
    return data as BillItem;
};

export const deleteBillItem = async (itemId: string) => {
    const { error } = await supabase
        .from('bill_items')
        .delete()
        .eq('id', itemId);
    if (error) throw error;
};

export const assignItem = async (
    itemId: string,
    participantId: string | null
): Promise<BillItem> => {
    const { data, error } = await supabase
        .from('bill_items')
        .update({ assigned_to: participantId })
        .eq('id', itemId)
        .select()
        .single();
    if (error) throw error;
    return data as BillItem;
};

// ─── PARTICIPANTS ───────────────────────────────────────────────────────────

export const getParticipants = async (billId: string): Promise<Participant[]> => {
    const { data, error } = await supabase
        .from('bill_participants')
        .select('*')
        .eq('bill_id', billId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as Participant[];
};

// ─── PAYMENT OPERATIONS ────────────────────────────────────────────────────

export const createPaymentRequests = async (
    billId: string,
    hostUserId: string,
    participants: Array<{ userId: string; amount: number }>
) => {
    const requests = participants
        .filter(p => p.userId !== hostUserId && p.amount > 0)
        .map(p => ({
            bill_id: billId,
            from_user_id: p.userId,
            to_user_id: hostUserId,
            amount: p.amount,
            status: 'pending',
        }));

    if (requests.length === 0) return [];

    const { data, error } = await supabase
        .from('payment_requests')
        .insert(requests)
        .select();
    if (error) throw error;
    return data || [];
};

export const markPaymentSent = async (requestId: string) => {
    const { data, error } = await supabase
        .from('payment_requests')
        .update({ status: 'sent' })
        .eq('id', requestId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const confirmPayment = async (requestId: string) => {
    const { data, error } = await supabase
        .from('payment_requests')
        .update({ status: 'confirmed' })
        .eq('id', requestId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getPaymentRequests = async (billId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('bill_id', billId);
    if (error) throw error;
    return data || [];
};

// ─── REALTIME SUBSCRIPTIONS ─────────────────────────────────────────────────

export const subscribeToBillStatus = (
    billId: string,
    onStatusChange: (status: BillStatus) => void
) => {
    const channel = supabase
        .channel(`bill-status-${billId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'bills',
                filter: `id=eq.${billId}`,
            },
            (payload) => {
                const newStatus = (payload.new as any).status as BillStatus;
                console.log('[Realtime] Bill status changed:', newStatus);
                onStatusChange(newStatus);
            }
        )
        .subscribe();
    return channel;
};

export const subscribeToBillItems = (
    billId: string,
    onItemChange: (item: BillItem) => void
) => {
    const channel = supabase
        .channel(`bill-items-${billId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'bill_items',
                filter: `bill_id=eq.${billId}`,
            },
            (payload) => {
                console.log('[Realtime] Bill item updated:', payload.new);
                onItemChange(payload.new as BillItem);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'bill_items',
                filter: `bill_id=eq.${billId}`,
            },
            (payload) => {
                console.log('[Realtime] Bill item inserted:', payload.new);
                onItemChange(payload.new as BillItem);
            }
        )
        .subscribe();
    return channel;
};

export const subscribeToParticipants = (
    billId: string,
    onParticipantChange: (participant: Participant) => void
) => {
    const channel = supabase
        .channel(`bill-participants-${billId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'bill_participants',
                filter: `bill_id=eq.${billId}`,
            },
            (payload) => {
                console.log('[Realtime] Participant joined:', payload.new);
                onParticipantChange(payload.new as Participant);
            }
        )
        .subscribe();
    return channel;
};

export const subscribeToPaymentRequests = (
    billId: string,
    onUpdate: (request: PaymentRequest) => void
) => {
    const channel = supabase
        .channel(`payment-requests-${billId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'payment_requests',
                filter: `bill_id=eq.${billId}`,
            },
            (payload) => {
                console.log('[Realtime] Payment request update:', payload.new);
                onUpdate(payload.new as PaymentRequest);
            }
        )
        .subscribe();
    return channel;
};

export const unsubscribeAll = (channels: any[]) => {
    channels.forEach(ch => {
        if (ch) supabase.removeChannel(ch);
    });
};

// ─── SHARE CALCULATION ──────────────────────────────────────────────────────

export const calculateShares = (
    billItems: BillItem[],
    tax: number,
    tip: number,
    participants: Participant[]
): Record<string, number> => {
    const subtotal = billItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const shares: Record<string, number> = {};

    // Initialize all participants with 0
    participants.forEach(p => { shares[p.id] = 0; });

    // Add item costs based on assignment
    billItems.forEach(item => {
        if (item.assigned_to && shares[item.assigned_to] !== undefined) {
            shares[item.assigned_to] += item.price * item.quantity;
        }
    });

    // Add proportional tax and tip
    participants.forEach(p => {
        const itemShare = shares[p.id];
        const proportion = subtotal > 0
            ? itemShare / subtotal
            : 1 / participants.length;
        shares[p.id] += (tax + tip) * proportion;
    });

    return shares;
};

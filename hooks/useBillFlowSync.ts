import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getBill, subscribeToBillStatus } from '../services/billService';
import { BillStatus } from '../types';

export function useBillFlowSync(
    billId: string | undefined,
    currentScreen: 'active' | 'tip_selection' | 'completed' | 'lobby',
    isHost: boolean
): BillStatus | null {
    const router = useRouter();
    const [status, setStatus] = useState<BillStatus | null>(null);
    const initialAlignDone = useRef(false);

    useEffect(() => {
        if (!billId || billId === 'new') return;

        const handleNavigation = (targetStatus: BillStatus) => {
            if (targetStatus === 'active' && currentScreen !== 'active') {
                console.log('[useBillFlowSync] Navigating to active (splitting)');
                router.replace({
                    pathname: '/bill/[id]' as any,
                    params: { id: billId, fromParty: 'true' }
                });
            } else if (targetStatus === 'tip_selection' && currentScreen !== 'tip_selection') {
                console.log('[useBillFlowSync] Navigating to tip_selection');
                router.replace({
                    pathname: '/bill/tip' as any,
                    params: { billId, fromParty: 'true' }
                });
            } else if ((targetStatus === 'completed' || targetStatus === 'settled') && currentScreen !== 'completed') {
                console.log('[useBillFlowSync] Navigating to completed (payment)');
                router.replace({
                    pathname: '/bill/payment' as any,
                    params: { billId, fromParty: 'true' }
                });
            } else if (targetStatus === 'draft' && currentScreen !== 'lobby') {
                console.log('[useBillFlowSync] Navigating to draft (lobby)');
                router.replace({
                    pathname: '/bill/party' as any,
                    params: { id: billId, fromParty: 'true' }
                });
            }
        };

        // Align status immediately on mount
        const alignStatus = async () => {
            try {
                const bill = await getBill(billId);
                if (bill && bill.status) {
                    setStatus(bill.status as BillStatus);
                    if (!initialAlignDone.current) {
                        initialAlignDone.current = true;
                        handleNavigation(bill.status as BillStatus);
                    }
                }
            } catch (err) {
                console.error('[useBillFlowSync] Error fetching initial status:', err);
            }
        };
        alignStatus();

        // Subscribe to real-time status updates
        const channel = subscribeToBillStatus(billId, (newStatus) => {
            setStatus(newStatus);
            handleNavigation(newStatus);
        });

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [billId, currentScreen]);

    return status;
}

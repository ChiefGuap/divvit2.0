import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Bill = {
    id: string;
    host_id: string;
    total_amount: number;
    status: 'draft' | 'completed';
    details: {
        items?: { id: string; name: string; price: number }[];
        users?: { id: string; name: string }[];
        closedAt?: string;
    };
    created_at: string;
};

type DraftBill = {
    id: string;
    itemCount: number;
    createdAt: string;
    formattedDate: string;
};

type RecentActivity = {
    id: string;
    title: string;
    subtitle: string;
};

export type HomeStats = {
    points: number;
    totalSplit: number;
    minutesSaved: number;
    recentActivity: RecentActivity[];
    drafts: DraftBill[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    deleteDraft: (draftId: string) => Promise<boolean>;
};

const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return 'Last Week';
};

const formatDraftDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    if (isToday) {
        return `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${timeStr}`;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

const formatBillTitle = (bill: Bill): string => {
    const users = bill.details?.users || [];
    if (users.length === 0) return 'Bill Split';

    const names = users.slice(0, 2).map(u => u.name);
    if (users.length > 2) {
        return `Bill Split with ${names.join(', ')} +${users.length - 2}`;
    }
    return `Bill Split with ${names.join(' and ')}`;
};

export function useHomeStats(): HomeStats {
    const { user, profile, session, isLoading: isAuthLoading } = useAuth();
    const [isFetching, setIsFetching] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completedBills, setCompletedBills] = useState<Bill[]>([]);
    const [draftBills, setDraftBills] = useState<Bill[]>([]);

    const fetchBills = useCallback(async () => {
        // CRITICAL: Don't fetch while auth is still loading
        if (isAuthLoading) {
            return;
        }

        if (!user || !session) {
            // Auth finished but no user - that's fine, no bills to show
            setHasFetched(true);
            return;
        }

        setIsFetching(true);
        setError(null);

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            // Fetch completed/settled bills - include all finished bill statuses
            const completedResponse = await fetch(
                `${supabaseUrl}/rest/v1/bills?host_id=eq.${user.id}&status=in.(settled,completed,paid,closed)&select=*&order=created_at.desc`,
                {
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            // Fetch draft bills
            const draftsResponse = await fetch(
                `${supabaseUrl}/rest/v1/bills?host_id=eq.${user.id}&status=eq.draft&select=*&order=created_at.desc`,
                {
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!completedResponse.ok || !draftsResponse.ok) {
                console.error('useHomeStats: Error fetching bills');
                setError('Failed to fetch bills');
                return;
            }

            const completedData = await completedResponse.json();
            const draftsData = await draftsResponse.json();

            setCompletedBills(completedData || []);
            setDraftBills(draftsData || []);
        } catch (err) {
            console.error('useHomeStats: Unexpected error:', err);
            setError('Failed to fetch bills');
        } finally {
            setIsFetching(false);
            setHasFetched(true);
        }
    }, [user, session, isAuthLoading]);

    // Delete a draft bill - Hard delete using Supabase client
    const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
        if (!user || !session) {
            console.log('deleteDraft: No user or session');
            return false;
        }

        console.log('deleteDraft: Starting hard delete for', draftId);

        // 1. Optimistic Update - Immediate UI removal
        setDraftBills(prev => prev.filter(d => d.id !== draftId));

        try {
            // 2. Permanent Database Delete using Supabase client
            const { error } = await supabase
                .from('bills')
                .delete()
                .eq('id', draftId);

            if (error) {
                console.error('deleteDraft: Error:', error);
                // Re-sync with server on failure
                await fetchBills();
                return false;
            }

            console.log('deleteDraft: Hard delete successful');
            return true;
        } catch (err) {
            console.error('deleteDraft: Exception:', err);
            // Re-sync with server on failure
            await fetchBills();
            return false;
        }
    }, [user, session, fetchBills]);

    useEffect(() => {
        // Only fetch when auth is done loading and we haven't fetched yet
        if (!isAuthLoading && !hasFetched && !isFetching) {
            fetchBills();
        }
    }, [isAuthLoading, hasFetched, isFetching, fetchBills]);

    // Calculate stats from completed bills only
    const totalSplit = completedBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const minutesSaved = completedBills.length * 5;
    const points = profile?.points || 0;

    // Get 2 most recent completed bills for activity
    const recentActivity: RecentActivity[] = completedBills.slice(0, 2).map(bill => ({
        id: bill.id,
        title: formatBillTitle(bill),
        subtitle: getTimeAgo(bill.created_at),
    }));

    // Format drafts for display
    const drafts: DraftBill[] = draftBills.map(bill => ({
        id: bill.id,
        itemCount: bill.details?.items?.length || 0,
        createdAt: bill.created_at,
        formattedDate: formatDraftDate(bill.created_at),
    }));

    // CRITICAL: isLoading is true while auth is loading OR while we're fetching
    // This prevents flash of empty data
    const isLoading = isAuthLoading || isFetching || (!hasFetched && !error);

    return {
        points,
        totalSplit,
        minutesSaved,
        recentActivity,
        drafts,
        isLoading,
        error,
        refetch: fetchBills,
        deleteDraft,
    };
}

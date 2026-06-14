import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
    fetchUserPointsTable,
    getRewardsCatalog,
} from '../services/rewardsService';
import type { CatalogItem } from '../utils/rewardsMath';

type RewardsContextValue = {
    points: number | null;
    streak: number;
    lastSplitDate: string | null;
    catalog: CatalogItem[];
    isLoading: boolean;
    refresh: () => Promise<void>;
    setPointsOptimistic: (n: number) => void;
};

const RewardsContext = createContext<RewardsContextValue>({
    points: null,
    streak: 0,
    lastSplitDate: null,
    catalog: [],
    isLoading: false,
    refresh: async () => { },
    setPointsOptimistic: () => { },
});

export function useRewards() {
    return useContext(RewardsContext);
}

export function RewardsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [points, setPoints] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);
    const [lastSplitDate, setLastSplitDate] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const catalogRef = useRef<CatalogItem[]>([]);
    catalogRef.current = catalog;

    const userIdRef = useRef<string | null>(null);

    const refresh = useCallback(async () => {
        const currentUserId = userIdRef.current;
        if (!currentUserId) return;

        setIsLoading(true);
        try {
            const needCatalog = catalogRef.current.length === 0;

            const [pointsResult, catalogResult] = await Promise.all([
                fetchUserPointsTable(currentUserId).catch((err) => {
                    console.warn('[Rewards] fetchUserPointsTable failed:', err?.message || err);
                    return null;
                }),
                needCatalog
                    ? getRewardsCatalog().catch((err) => {
                        console.warn('[Rewards] getRewardsCatalog failed:', err?.message || err);
                        return [];
                    })
                    : Promise.resolve(null),
            ]);

            if (pointsResult !== null) {
                setPoints(pointsResult.total_points);
                setStreak(pointsResult.current_streak_days);
                setLastSplitDate(pointsResult.last_completed_on);
            }
            if (needCatalog && Array.isArray(catalogResult)) {
                setCatalog(catalogResult as CatalogItem[]);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        userIdRef.current = user?.id ?? null;
        if (!user?.id) {
            setPoints(null);
            setStreak(0);
            setLastSplitDate(null);
            return;
        }

        refresh();

        const channel = supabase
            .channel(`realtime:user_points:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_points',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[RewardsContext] Realtime update on user_points:', payload.new);
                    const newPoints = (payload.new as any).total_points;
                    const newStreak = (payload.new as any).current_streak_days;
                    if (newPoints !== undefined) setPoints(newPoints);
                    if (newStreak !== undefined) setStreak(newStreak);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, refresh]);

    useEffect(() => {
        const handleAppStateChange = (next: AppStateStatus) => {
            if (next === 'active' && userIdRef.current) {
                refresh();
            }
        };
        const sub = AppState.addEventListener('change', handleAppStateChange);
        return () => sub.remove();
    }, [refresh]);

    const setPointsOptimistic = useCallback((n: number) => {
        setPoints(n);
    }, []);

    return (
        <RewardsContext.Provider
            value={{
                points,
                streak,
                lastSplitDate,
                catalog,
                isLoading,
                refresh,
                setPointsOptimistic,
            }}
        >
            {children}
        </RewardsContext.Provider>
    );
}

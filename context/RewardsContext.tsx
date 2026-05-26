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
import {
    getUserPoints,
    getUserRewardsState,
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

            const [pointsResult, stateResult, catalogResult] = await Promise.all([
                getUserPoints(currentUserId).catch((err) => {
                    console.warn('[Rewards] getUserPoints failed:', err?.message || err);
                    return null;
                }),
                getUserRewardsState(currentUserId).catch((err) => {
                    console.warn('[Rewards] getUserRewardsState failed:', err?.message || err);
                    return null;
                }),
                needCatalog
                    ? getRewardsCatalog().catch((err) => {
                        console.warn('[Rewards] getRewardsCatalog failed:', err?.message || err);
                        return [];
                    })
                    : Promise.resolve(null),
            ]);

            if (pointsResult !== null) setPoints(pointsResult);
            if (stateResult) {
                setStreak((stateResult as any).current_streak_days ?? 0);
                setLastSplitDate((stateResult as any).last_split_date ?? null);
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
        if (user?.id) {
            refresh();
        } else {
            setPoints(null);
            setStreak(0);
            setLastSplitDate(null);
        }
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

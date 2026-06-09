import { supabase } from '../lib/supabase';

// ─── BALANCE ────────────────────────────────────────────────────────────────

export const getUserPoints = async (userId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_user_points', {
        p_user_id: userId,
    });
    if (error) throw error;
    return data ?? 0;
};

// ─── HISTORY ────────────────────────────────────────────────────────────────

export const getPointHistory = async (userId: string, limit: number = 20) => {
    const { data, error } = await supabase
        .from('point_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
};

// ─── EVENT AWARDS ───────────────────────────────────────────────────────────

export type AwardResult = {
    points_awarded: number;
    new_balance: number;
    event_type: string;
};

export const awardDailyLogin = async (userId: string): Promise<AwardResult> => {
    const { data, error } = await supabase.rpc('check_and_award_event_points', {
        p_user_id: userId,
        p_event_type: 'daily_login',
    });
    if (error) throw error;
    return data as AwardResult;
};

// ─── REWARDS STATE ──────────────────────────────────────────────────────────

export const getUserRewardsState = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_rewards_state')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    return data;
};

export const getUserStreak = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_rewards_state')
        .select('current_streak_days, last_split_date')
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    return data;
};

// ─── REFERRALS ──────────────────────────────────────────────────────────────

export const getReferralCode = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('user_rewards_state')
        .select('referral_code')
        .eq('user_id', userId)
        .single();
    if (error) throw error;

    if (!data?.referral_code) {
        const { data: code, error: rpcError } = await supabase.rpc(
            'generate_referral_code',
            { p_user_id: userId },
        );
        if (rpcError) throw rpcError;
        return code ?? null;
    }

    return data.referral_code;
};

export const processReferralCode = async (
    newUserId: string,
    referralCode: string,
) => {
    const { data, error } = await supabase.rpc('process_referral', {
        p_referred_user_id: newUserId,
        p_referral_code: referralCode,
    });
    if (error) throw error;
    return data as { success: boolean; referrer_id?: string; error?: string };
};

// ─── CATALOG ────────────────────────────────────────────────────────────────

export const getRewardsCatalog = async () => {
    const { data, error } = await supabase
        .from('rewards_catalog')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
};

// ─── PER-BILL POINTS ────────────────────────────────────────────────────────

export const getPointsForBill = async (userId: string, billId: string) => {
    const { data, error } = await supabase
        .from('point_ledger')
        .select('*')
        .eq('user_id', userId)
        .eq('bill_id', billId);
    if (error) throw error;
    const entries = data ?? [];
    const total = entries.reduce(
        (sum: number, row: any) => sum + (row.points > 0 ? row.points : 0),
        0,
    );
    return { total, entries };
};

// ─── PROMOTION EVENT ────────────────────────────────────────────────────────

export const awardUsePromotion = async (
    userId: string,
    dealId?: string,
): Promise<AwardResult> => {
    const { data, error } = await supabase.rpc('check_and_award_event_points', {
        p_user_id: userId,
        p_event_type: 'use_promotion',
        p_metadata: dealId ? { deal_id: dealId } : {},
    });
    if (error) throw error;
    return data as AwardResult;
};

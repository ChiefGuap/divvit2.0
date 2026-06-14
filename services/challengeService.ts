import { supabase } from '../lib/supabase';
import { Challenge, GroupChallenge } from '../types/challenges';

const mapChallengeRow = (row: any): Challenge => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle || undefined,
    description: row.description,
    points: row.points,
    brand: row.brand || undefined,
    imageUrl: row.image_url || undefined,
    iconName: row.icon_name || undefined,
    endsAt: row.ends_at,
    ctaLabel: row.kind === 'daily' 
        ? 'Scan Receipt' 
        : row.kind === 'referral' 
            ? 'Copy Invite Link' 
            : row.kind === 'group' 
                ? 'Group Progress' 
                : 'Claim Challenge',
    completedTodayCount: row.kind === 'daily' ? 340 : undefined,
});

const mapGroupChallengeRow = (row: any): GroupChallenge => ({
    ...mapChallengeRow(row),
    kind: 'group',
    goalCount: 4,
    completedCount: 2,
    perMemberPoints: row.points,
});

export const getActiveChallenges = async (): Promise<Challenge[]> => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[ChallengeService] Error fetching active challenges:', error.message);
        throw error;
    }

    return (data || []).map((row: any) => {
        if (row.kind === 'group') {
            return mapGroupChallengeRow(row);
        }
        return mapChallengeRow(row);
    });
};

export const getChallengeById = async (id: string): Promise<Challenge | null> => {
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[ChallengeService] Error fetching challenge by id:', error.message);
        throw error;
    }

    if (!data) return null;

    if (data.kind === 'group') {
        return mapGroupChallengeRow(data);
    }
    return mapChallengeRow(data);
};

export type ChallengeKind = 'daily' | 'standard' | 'group' | 'referral';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  title: string;
  subtitle?: string;
  description: string;
  points: number;
  brand?: string;
  imageUrl?: string;
  iconName?: string;
  endsAt: string; // ISO string
  ctaLabel?: string;
  completedTodayCount?: number;
}

export interface GroupChallenge extends Challenge {
  kind: 'group';
  goalCount: number;
  completedCount: number;
  perMemberPoints: number;
}

export interface UserPoints {
  total: number;
  streakDays: number;
}

import { Challenge, GroupChallenge, UserPoints } from '../types/challenges';

// Utility helper to create future ISO timestamps dynamically
const getRelativeFutureTime = (hours: number, minutes: number = 0) => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
};

export const mockUserPoints: UserPoints = {
  total: 133,
  streakDays: 12,
};

export const mockDailyChallenge: Challenge = {
  id: 'daily-habit-burger',
  kind: 'daily',
  title: 'Smash Burger Sunday',
  brand: 'Habit Burger',
  points: 25,
  endsAt: getRelativeFutureTime(14, 22),
  description: 'Scan any receipt from Habit Burger today to earn 25 bonus pts!',
  ctaLabel: 'Scan Receipt',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAif20bBkYW58GzKVnV82rFjbEeV5p3n__zJEJLZtKCZxvGzJ8MVekcXBOKLXa32pawNOTifEy9dtW_cfJ2AmKraLs6cweP9utVQG6SsZNQCFQa6GgpT_FnBDEfXH7Myt9LQWRynG84wjjkMWXAyEiIaIApXExrtEY6UzGNceZCRztltbRgWIMMcP0hKJ0K3i3IlNi24MlcTHGcWCzUm62jb65OyAfFW9Goj5Z1_-23OUziYA5UcLxU1J9zmPzn9VW6LemYFHhG6_L6',
  completedTodayCount: 340,
};

export const mockStandardChallenges: Challenge[] = [
  {
    id: 'std-gor-gai',
    kind: 'standard',
    title: 'Gor Gai Eatery',
    subtitle: 'Get their Pad-Thai menu item',
    points: 100,
    endsAt: getRelativeFutureTime(48), // 2 days
    description: 'Scan a receipt from Gor Gai Eatery including a Pad-Thai order.',
    ctaLabel: 'Claim Challenge',
  },
  {
    id: 'std-group-feast',
    kind: 'standard',
    title: "Tim's Avenue",
    subtitle: 'Get their Pork Belly Fries..',
    points: 200,
    endsAt: getRelativeFutureTime(120), // 5 days
    description: 'Create a split bill with 3 or more friends to unlock group feast points.',
    ctaLabel: 'Claim Challenge',
  },
  {
    id: 'std-sushi-saturday',
    kind: 'standard',
    title: 'Chick-fil-A',
    subtitle: 'Get their Cobb Salad...',
    points: 150,
    endsAt: getRelativeFutureTime(24), // 1 day
    description: 'Order any sushi platter on Saturday and scan the receipt.',
    ctaLabel: 'Claim Challenge',
  },
  {
    id: 'std-late-night',
    kind: 'standard',
    title: 'Cafe BNA',
    subtitle: 'Get their Matcha Latte...',
    points: 75,
    endsAt: getRelativeFutureTime(4), // 4 hours
    description: 'Grab a bite late and upload your receipt matching a timestamp after 10:00 PM.',
    ctaLabel: 'Claim Challenge',
  }
];

export const mockGroupChallenge: GroupChallenge = {
  id: 'group-save-together',
  kind: 'group',
  title: 'Save Together!',
  description: 'Complete 4 orders with your group this week to earn 100 bonus pts each!',
  points: 100,
  goalCount: 4,
  completedCount: 2,
  perMemberPoints: 100,
  endsAt: getRelativeFutureTime(120), // 5 days
  ctaLabel: 'Group Progress',
};

export const mockReferralChallenge: Challenge = {
  id: 'referral-challenge',
  kind: 'referral',
  title: 'Referral Bonus',
  description: 'Invite your friends to join Divvit! You will receive 25 PTS for every friend who signs up.',
  points: 25,
  endsAt: getRelativeFutureTime(720), // 30 days
  ctaLabel: 'Copy Invite Link',
  imageUrl: 'divvit.app/u/opendivvit',
};

// Arrays to support carousel scrolling
export const mockDailyChallenges: Challenge[] = [
  mockDailyChallenge,
  {
    id: 'daily-pizza-party',
    kind: 'daily',
    title: 'Pizza Party Friday',
    brand: 'Pizza Hut',
    points: 50,
    endsAt: getRelativeFutureTime(24),
    description: 'Scan any receipt from Pizza Hut today to earn 50 bonus pts!',
    ctaLabel: 'Scan Receipt',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
  },
  {
    id: 'daily-taco-tuesday',
    kind: 'daily',
    title: 'Taco Tuesday',
    brand: 'Taco Bell',
    points: 30,
    endsAt: getRelativeFutureTime(12),
    description: 'Scan any receipt from Taco Bell today to earn 30 bonus pts!',
    ctaLabel: 'Scan Receipt',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
  }
];

export const mockGroupChallenges: GroupChallenge[] = [
  mockGroupChallenge,
  {
    id: 'group-coffee-club',
    kind: 'group',
    title: 'Coffee Club',
    description: 'Complete 5 coffee splits with your group this week to earn 50 bonus pts each!',
    points: 50,
    goalCount: 5,
    completedCount: 3,
    perMemberPoints: 50,
    endsAt: getRelativeFutureTime(72),
    ctaLabel: 'Group Progress',
  },
  {
    id: 'group-weekend-brunch',
    kind: 'group',
    title: 'Weekend Brunch',
    description: 'Complete 2 brunch splits with your group this weekend to earn 75 bonus pts each!',
    points: 75,
    goalCount: 2,
    completedCount: 1,
    perMemberPoints: 75,
    endsAt: getRelativeFutureTime(48),
    ctaLabel: 'Group Progress',
  }
];

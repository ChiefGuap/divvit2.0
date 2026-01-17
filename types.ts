// Shared types for the multiplayer bill-splitting system

export type Participant = {
    id: string;
    bill_id: string;
    user_id: string | null;
    name: string;
    is_guest: boolean;
    avatar_url?: string;
    color: string;
    initials: string;
};

// Bill status types
export type BillStatus = 'draft' | 'active' | 'completed';

// Participant colors - cycle through these for new participants
export const PARTICIPANT_COLORS = [
    '#B54CFF', // Purple (primary)
    '#FF4C4C', // Red
    '#4CFFB5', // Mint
    '#FFB54C', // Orange
    '#4CB5FF', // Blue
    '#FF69B4', // Pink
    '#00D9FF', // Cyan
    '#9B59B6', // Amethyst
];

// Get initials from name
export const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

// Get next available color based on existing participants
export const getNextColor = (existingCount: number): string => {
    return PARTICIPANT_COLORS[existingCount % PARTICIPANT_COLORS.length];
};

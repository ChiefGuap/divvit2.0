export type CatalogItem = {
    id: string;
    name: string;
    points_required: number;
    [key: string]: any;
};

export type NextRewardResult = {
    nextReward: CatalogItem | null;
    pointsLeft: number;
    progressPercent: number;
    totalNeeded: number;
    isMaxed: boolean;
};

export function getNextReward(
    points: number,
    catalog: CatalogItem[],
): NextRewardResult {
    if (!catalog || catalog.length === 0) {
        return {
            nextReward: null,
            pointsLeft: 0,
            progressPercent: 0,
            totalNeeded: 0,
            isMaxed: false,
        };
    }

    const sorted = [...catalog].sort(
        (a, b) => a.points_required - b.points_required,
    );

    const next = sorted.find((item) => item.points_required > points);

    if (!next) {
        const top = sorted[sorted.length - 1];
        return {
            nextReward: top,
            pointsLeft: 0,
            progressPercent: 1,
            totalNeeded: top.points_required,
            isMaxed: true,
        };
    }

    const pointsLeft = Math.max(0, next.points_required - points);
    const progressPercent = Math.min(1, Math.max(0, points / next.points_required));

    return {
        nextReward: next,
        pointsLeft,
        progressPercent,
        totalNeeded: next.points_required,
        isMaxed: false,
    };
}

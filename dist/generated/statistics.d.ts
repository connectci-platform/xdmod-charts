export type Statistic = {
    kind: "total" | "average";
    unit: string;
    additive: boolean;
};
export declare const STATISTICS: Record<string, Statistic>;

import { z } from 'zod';
export declare const SCHEMA_VERSION: "v1";
export declare const NormalizedTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodString;
    amount: z.ZodNumber;
    merchantRaw: z.ZodString;
    merchant: z.ZodString;
    category: z.ZodString;
    source: z.ZodEnum<{
        csv: "csv";
        bank: "bank";
        demo: "demo";
    }>;
}, z.core.$strip>;
export declare const RecurringChargeSchema: z.ZodObject<{
    id: z.ZodString;
    merchant: z.ZodString;
    cadence: z.ZodEnum<{
        weekly: "weekly";
        biweekly: "biweekly";
        monthly: "monthly";
    }>;
    nextDate: z.ZodString;
    expectedAmount: z.ZodNumber;
    confidence: z.ZodNumber;
}, z.core.$strip>;
export declare const SummarySchema: z.ZodObject<{
    transactions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        date: z.ZodString;
        amount: z.ZodNumber;
        merchantRaw: z.ZodString;
        merchant: z.ZodString;
        category: z.ZodString;
        source: z.ZodEnum<{
            csv: "csv";
            bank: "bank";
            demo: "demo";
        }>;
    }, z.core.$strip>>;
    byCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
    byMerchant: z.ZodRecord<z.ZodString, z.ZodNumber>;
    recurring: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        merchant: z.ZodString;
        cadence: z.ZodEnum<{
            weekly: "weekly";
            biweekly: "biweekly";
            monthly: "monthly";
        }>;
        nextDate: z.ZodString;
        expectedAmount: z.ZodNumber;
        confidence: z.ZodNumber;
    }, z.core.$strip>>;
    totalSpend: z.ZodNumber;
}, z.core.$strip>;
export declare const GoalInputSchema: z.ZodUnion<readonly [z.ZodObject<{
    goalType: z.ZodLiteral<"save_by_date">;
    saveAmount: z.ZodNumber;
    byDate: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    goalType: z.ZodLiteral<"monthly_cap">;
    category: z.ZodString;
    capAmount: z.ZodNumber;
}, z.core.$strip>]>;
export declare const ActionRecommendationSchema: z.ZodObject<{
    id: z.ZodString;
    actionType: z.ZodEnum<{
        cancel: "cancel";
        cap: "cap";
        substitute: "substitute";
    }>;
    title: z.ZodString;
    target: z.ZodObject<{
        kind: z.ZodEnum<{
            merchant: "merchant";
            category: "category";
        }>;
        value: z.ZodString;
    }, z.core.$strip>;
    expectedMonthlySavings: z.ZodNumber;
    effortScore: z.ZodNumber;
    confidence: z.ZodNumber;
    explanation: z.ZodString;
    reasons: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const TreemapTileSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    value: z.ZodNumber;
    color: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, z.core.$strip>;
export declare const AnalyzeTransactionsInputSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodLiteral<"v1">>;
    transactions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        date: z.ZodString;
        amount: z.ZodNumber;
        merchantRaw: z.ZodString;
        merchant: z.ZodString;
        category: z.ZodString;
        source: z.ZodEnum<{
            csv: "csv";
            bank: "bank";
            demo: "demo";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const AnalyzeTransactionsOutputSchema: z.ZodObject<{
    version: z.ZodLiteral<"v1">;
    summary: z.ZodObject<{
        transactions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodString;
            amount: z.ZodNumber;
            merchantRaw: z.ZodString;
            merchant: z.ZodString;
            category: z.ZodString;
            source: z.ZodEnum<{
                csv: "csv";
                bank: "bank";
                demo: "demo";
            }>;
        }, z.core.$strip>>;
        byCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byMerchant: z.ZodRecord<z.ZodString, z.ZodNumber>;
        recurring: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            merchant: z.ZodString;
            cadence: z.ZodEnum<{
                weekly: "weekly";
                biweekly: "biweekly";
                monthly: "monthly";
            }>;
            nextDate: z.ZodString;
            expectedAmount: z.ZodNumber;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
        totalSpend: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const BuildMosaicSpecInputSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodLiteral<"v1">>;
    byCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, z.core.$strip>;
export declare const BuildMosaicSpecOutputSchema: z.ZodObject<{
    version: z.ZodLiteral<"v1">;
    tiles: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodNumber;
        color: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const BuildActionPlanInputSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodLiteral<"v1">>;
    summary: z.ZodObject<{
        transactions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodString;
            amount: z.ZodNumber;
            merchantRaw: z.ZodString;
            merchant: z.ZodString;
            category: z.ZodString;
            source: z.ZodEnum<{
                csv: "csv";
                bank: "bank";
                demo: "demo";
            }>;
        }, z.core.$strip>>;
        byCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byMerchant: z.ZodRecord<z.ZodString, z.ZodNumber>;
        recurring: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            merchant: z.ZodString;
            cadence: z.ZodEnum<{
                weekly: "weekly";
                biweekly: "biweekly";
                monthly: "monthly";
            }>;
            nextDate: z.ZodString;
            expectedAmount: z.ZodNumber;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
        totalSpend: z.ZodNumber;
    }, z.core.$strip>;
    goal: z.ZodUnion<readonly [z.ZodObject<{
        goalType: z.ZodLiteral<"save_by_date">;
        saveAmount: z.ZodNumber;
        byDate: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        goalType: z.ZodLiteral<"monthly_cap">;
        category: z.ZodString;
        capAmount: z.ZodNumber;
    }, z.core.$strip>]>;
}, z.core.$strip>;
export declare const BuildActionPlanOutputSchema: z.ZodObject<{
    version: z.ZodLiteral<"v1">;
    actions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        actionType: z.ZodEnum<{
            cancel: "cancel";
            cap: "cap";
            substitute: "substitute";
        }>;
        title: z.ZodString;
        target: z.ZodObject<{
            kind: z.ZodEnum<{
                merchant: "merchant";
                category: "category";
            }>;
            value: z.ZodString;
        }, z.core.$strip>;
        expectedMonthlySavings: z.ZodNumber;
        effortScore: z.ZodNumber;
        confidence: z.ZodNumber;
        explanation: z.ZodString;
        reasons: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map
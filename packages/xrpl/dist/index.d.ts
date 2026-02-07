export type RoundupResult = {
    mode: 'simulated';
    amountXrp: number;
    txHash: string;
} | {
    mode: 'testnet';
    amountXrp: number;
    txHash: string;
};
export declare function simulateRoundupPayment(params: {
    amountXrp: number;
    memo: string;
}): Promise<RoundupResult>;
//# sourceMappingURL=index.d.ts.map
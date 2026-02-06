export type RoundupResult =
  | { mode: 'simulated'; amountXrp: number; txHash: string }
  | { mode: 'testnet'; amountXrp: number; txHash: string };

export async function simulateRoundupPayment(params: {
  amountXrp: number;
  memo: string;
}): Promise<RoundupResult> {
  // Demo-safe simulation.
  const fake = `SIM_${Math.random().toString(16).slice(2)}`;
  return { mode: 'simulated', amountXrp: params.amountXrp, txHash: fake };
}

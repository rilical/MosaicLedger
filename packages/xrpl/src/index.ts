export type RoundupResult =
  | { mode: 'simulated'; amountXrp: number; txHash: string }
  | { mode: 'testnet'; amountXrp: number; txHash: string };

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // 32-bit FNV prime via shifts (fast, deterministic)
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

function toHex(n: number): string {
  return n.toString(16).padStart(8, '0');
}

export async function simulateRoundupPayment(params: {
  amountXrp: number;
  memo: string;
}): Promise<RoundupResult> {
  // Demo-safe deterministic simulation (same inputs => same hash).
  const seed = `${params.amountXrp.toFixed(6)}|${params.memo}`;
  const h1 = fnv1a32(seed);
  const h2 = fnv1a32(`${seed}|2`);
  const fake = `SIM_${toHex(h1)}${toHex(h2)}`.toUpperCase();
  return { mode: 'simulated', amountXrp: params.amountXrp, txHash: fake };
}

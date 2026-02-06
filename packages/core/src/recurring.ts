import type { NormalizedTransaction, RecurringCharge } from './types';
import { stableId } from './normalize';

function median(nums: number[]): number {
  const arr = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1]! + arr[mid]!) / 2 : arr[mid]!;
}

function stdev(nums: number[]): number {
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, b) => a + (b - mean) * (b - mean), 0) / nums.length;
  return Math.sqrt(v);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function detectRecurring(transactions: NormalizedTransaction[]): RecurringCharge[] {
  const byMerchant = new Map<string, NormalizedTransaction[]>();
  for (const t of transactions) {
    if (t.amount <= 0) continue; // ignore refunds/credits for recurring detection
    const arr = byMerchant.get(t.merchant) ?? [];
    arr.push(t);
    byMerchant.set(t.merchant, arr);
  }

  const out: RecurringCharge[] = [];

  for (const [merchant, txns] of byMerchant) {
    if (txns.length < 3) continue;

    const sorted = [...txns].sort((a, b) => (a.date < b.date ? -1 : 1));
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      deltas.push(daysBetween(sorted[i - 1]!.date, sorted[i]!.date));
    }

    const m = median(deltas);

    let cadence: RecurringCharge['cadence'] | null = null;
    let cadenceDays = 0;
    if (Math.abs(m - 30) <= 5) {
      cadence = 'monthly';
      cadenceDays = 30;
    } else if (Math.abs(m - 14) <= 3) {
      cadence = 'biweekly';
      cadenceDays = 14;
    } else if (Math.abs(m - 7) <= 2) {
      cadence = 'weekly';
      cadenceDays = 7;
    }

    if (!cadence) continue;

    const amts = sorted.map((t) => t.amount);
    const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
    const cv = mean === 0 ? 1 : stdev(amts) / mean;

    const cadenceFit = Math.max(0, 1 - Math.min(1, Math.abs(m - cadenceDays) / cadenceDays));
    const amountStability = Math.max(0, 1 - Math.min(1, cv));
    const countScore = Math.min(1, txns.length / 6);

    const confidence = 0.45 * cadenceFit + 0.35 * amountStability + 0.2 * countScore;

    const last = sorted[sorted.length - 1]!;

    out.push({
      id: stableId(['recurring', merchant]),
      merchant,
      cadence,
      nextDate: addDays(last.date, cadenceDays),
      expectedAmount: mean,
      confidence,
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

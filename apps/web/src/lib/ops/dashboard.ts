import type { NormalizedTransaction, OpsFinding } from '@mosaicledger/contracts';

export type OpsKpis = {
  txnsCount: number;
  findingsCount: number;
  exceptionRate: number; // findings / txns
  totalSpend: number;
  avgDailySpend: number;
  riskScore: number; // 0..100
};

export type OpsForecast = {
  horizonDays: number;
  projectedSpend: number;
  projectedHighRiskEvents: number;
  projectedMedRiskEvents: number;
  basis: {
    daysObserved: number;
    avgDailySpend: number;
    highRiskPerDay: number;
    medRiskPerDay: number;
  };
};

export type OpsSeriesPoint = { date: string; value: number };

export type OpsDashboard = {
  kpis: OpsKpis;
  dailySpend: OpsSeriesPoint[];
  topMerchants: Array<{ label: string; value: number }>;
  topCategories: Array<{ label: string; value: number }>;
  findingsByKind: Array<{ label: string; value: number }>;
  forecast30d: OpsForecast;
};

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function daysInclusive(start: string, end: string): number {
  // YYYY-MM-DD in UTC
  const s = new Date(`${start}T00:00:00Z`).getTime();
  const e = new Date(`${end}T00:00:00Z`).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 1;
  const days = Math.floor((e - s) / (24 * 3600 * 1000)) + 1;
  return Math.max(1, days);
}

function sumPositiveSpend(txns: NormalizedTransaction[]): number {
  let total = 0;
  for (const t of txns) {
    const a = Number(t.amount);
    if (Number.isFinite(a) && a > 0) total += a;
  }
  return total;
}

function topN(map: Map<string, number>, n: number): Array<{ label: string; value: number }> {
  const items = Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((x) => Number.isFinite(x.value) && x.value > 0);

  items.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return items.slice(0, n);
}

function findingWeight(f: OpsFinding): number {
  if (f.severity === 'high') return 8;
  if (f.severity === 'med') return 4;
  return 1;
}

function computeRiskScore(findings: OpsFinding[], txnsCount: number): number {
  // Small, explainable risk score for demos (0..100). Not a real risk model.
  // Use an exponential saturation so the score stabilizes.
  let w = 0;
  for (const f of findings) w += findingWeight(f);

  const density = txnsCount > 0 ? w / Math.max(1, Math.sqrt(txnsCount)) : w;
  const score = 100 * (1 - Math.exp(-density / 6));
  return Math.round(clamp01(score / 100) * 100);
}

function kindLabel(kind: OpsFinding['kind']): string {
  if (kind === 'vendor_concentration') return 'Vendor concentration';
  if (kind === 'category_spike') return 'Category spike';
  if (kind === 'duplicate_suspect') return 'Duplicate suspect';
  if (kind === 'high_frequency_merchant') return 'High frequency';
  return 'Round amounts';
}

export function computeOpsDashboard(params: {
  txns: NormalizedTransaction[];
  findings: OpsFinding[];
  range: { start: string; end: string };
}): OpsDashboard {
  const { txns, findings, range } = params;
  const txnsCount = txns.length;
  const findingsCount = findings.length;
  const exceptionRate = txnsCount > 0 ? findingsCount / txnsCount : 0;
  const totalSpend = sumPositiveSpend(txns);

  const daysObserved = daysInclusive(range.start, range.end);
  const avgDailySpend = totalSpend / daysObserved;

  const byDay = new Map<string, number>();
  for (const t of txns) {
    const d = String(t.date ?? '').slice(0, 10);
    const a = Number(t.amount);
    if (!d || !Number.isFinite(a) || a <= 0) continue;
    byDay.set(d, (byDay.get(d) ?? 0) + a);
  }
  const dailySpend: OpsSeriesPoint[] = Array.from(byDay.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMerchant = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const t of txns) {
    const a = Number(t.amount);
    if (!Number.isFinite(a) || a <= 0) continue;
    const m = (t.merchant ?? t.merchantRaw ?? 'Unknown').trim() || 'Unknown';
    const c = (t.category ?? 'Uncategorized').trim() || 'Uncategorized';
    byMerchant.set(m, (byMerchant.get(m) ?? 0) + a);
    byCategory.set(c, (byCategory.get(c) ?? 0) + a);
  }

  const byKind = new Map<string, number>();
  for (const f of findings) byKind.set(kindLabel(f.kind), (byKind.get(kindLabel(f.kind)) ?? 0) + 1);

  const riskScore = computeRiskScore(findings, txnsCount);

  const hi = findings.filter((f) => f.severity === 'high').length;
  const med = findings.filter((f) => f.severity === 'med').length;
  const hiPerDay = hi / daysObserved;
  const medPerDay = med / daysObserved;

  const horizonDays = 30;
  const forecast30d: OpsForecast = {
    horizonDays,
    projectedSpend: avgDailySpend * horizonDays,
    projectedHighRiskEvents: Math.round(hiPerDay * horizonDays),
    projectedMedRiskEvents: Math.round(medPerDay * horizonDays),
    basis: {
      daysObserved,
      avgDailySpend,
      highRiskPerDay: hiPerDay,
      medRiskPerDay: medPerDay,
    },
  };

  return {
    kpis: {
      txnsCount,
      findingsCount,
      exceptionRate,
      totalSpend,
      avgDailySpend,
      riskScore,
    },
    dailySpend,
    topMerchants: topN(byMerchant, 6),
    topCategories: topN(byCategory, 6),
    findingsByKind: topN(byKind, 6),
    forecast30d,
  };
}

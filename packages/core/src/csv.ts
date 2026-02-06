import { normalizeMerchantName, stableId } from './normalize';
import type { NormalizedTransaction } from './types';

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser: supports quoted fields and commas.
  const out: string[] = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      const next = line[i + 1];
      if (inQ && next === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (!inQ && ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseTransactionsCsv(csv: string): NormalizedTransaction[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const iDate = idx('date');
  const iName = idx('name');
  const iAmount = idx('amount');
  const iCat = idx('category');

  if (iDate === -1 || iName === -1 || iAmount === -1) {
    throw new Error('CSV must include headers: date,name,amount (category optional)');
  }

  const txns: NormalizedTransaction[] = [];

  for (let row = 1; row < lines.length; row++) {
    const cols = parseCsvLine(lines[row]!);
    const date = (cols[iDate] ?? '').trim();
    const merchantRaw = (cols[iName] ?? '').trim();
    const amount = Number((cols[iAmount] ?? '').trim());
    const category = (iCat === -1 ? '' : (cols[iCat] ?? '')).trim();

    if (!date || !merchantRaw || !Number.isFinite(amount)) continue;

    const merchant = normalizeMerchantName(merchantRaw);

    txns.push({
      id: stableId([date, merchantRaw, String(amount)]),
      date,
      amount,
      merchantRaw,
      merchant,
      category: category || 'Uncategorized',
      source: 'csv',
    });
  }

  return txns;
}

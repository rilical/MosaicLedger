import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDemoTransactions } from '../packages/banking/src/index.ts';
import {
  normalizeRawTransactions,
  recommendActions,
  summarizeTransactions,
} from '../packages/core/src/index.ts';
import { buildTreemapTiles } from '../packages/mosaic/src/index.ts';

async function main() {
  const raw = getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo' });
  const summary = summarizeTransactions(txns);
  const tiles = buildTreemapTiles(summary.byCategory);
  const actions = recommendActions(summary, {
    goalType: 'save_by_date',
    saveAmount: 200,
    byDate: '2026-04-01',
  });

  const out = {
    generatedAt: new Date().toISOString(),
    counts: {
      raw: raw.length,
      normalized: txns.length,
      tiles: tiles.length,
      recurring: summary.recurring.length,
      actions: actions.length,
    },
    totals: {
      totalSpend: summary.totalSpend,
    },
    preview: {
      topTiles: tiles.slice(0, 6),
      recurring: summary.recurring,
      actions: actions.slice(0, 5),
    },
  };

  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dir = path.join(repoRoot, 'data', 'seed');
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'demoDerived.json');
  await writeFile(filePath, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`Seed OK: wrote ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

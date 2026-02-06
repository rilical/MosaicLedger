import { getDemoTransactions } from '../packages/banking/src/index.ts';
import { normalizeRawTransactions, summarizeTransactions } from '../packages/core/src/index.ts';
import { buildTreemapTiles } from '../packages/mosaic/src/index.ts';

async function main() {
  const raw = getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo' });
  const summary = summarizeTransactions(txns);
  const tiles = buildTreemapTiles(summary.byCategory);

  if (tiles.length === 0) {
    console.error('DEMO CHECK FAILED: no tiles generated');
    process.exit(1);
  }

  if (summary.recurring.length === 0) {
    console.error('DEMO CHECK FAILED: expected at least 1 recurring pattern');
    process.exit(1);
  }

  const total = tiles.reduce((acc, t) => acc + t.value, 0);
  if (total <= 0) {
    console.error('DEMO CHECK FAILED: non-positive total');
    process.exit(1);
  }

  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

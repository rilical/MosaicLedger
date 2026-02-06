import { readFile } from 'node:fs/promises';
import { parseTransactionsCsv, summarizeTransactions } from '../packages/core/src/index.ts';
import { buildTreemapTiles } from '../packages/mosaic/src/index.ts';

async function main() {
  const csvPath = new URL('../data/sample/transactions.csv', import.meta.url);
  const csv = await readFile(csvPath, 'utf8');
  const txns = parseTransactionsCsv(csv);
  const summary = summarizeTransactions(txns);
  const tiles = buildTreemapTiles(summary.byCategory);

  if (tiles.length === 0) {
    console.error('DEMO CHECK FAILED: no tiles generated');
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

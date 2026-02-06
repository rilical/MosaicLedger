import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseTransactionsCsv, summarizeTransactions, recommendActions } from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import { MosaicView } from '../components/MosaicView';
import { RecurringPanel } from '../components/RecurringPanel';
import { ActionsPanel } from '../components/ActionsPanel';

export default async function Page() {
  // Demo-safe default: always render sample on first load.
  const csvPath = path.join(process.cwd(), '..', '..', 'data', 'sample', 'transactions.csv');
  const csv = await readFile(csvPath, 'utf8');

  const txns = parseTransactionsCsv(csv);
  const summary = summarizeTransactions(txns);

  const tiles = buildTreemapTiles(summary.byCategory);
  const actions = recommendActions(summary, {
    goalType: 'save_by_date',
    saveAmount: 200,
    byDate: '2026-04-01',
  });

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1 className="h1">MosaicLedger</h1>
          <p className="tagline">Enter with fragments. Leave with something whole.</p>
        </div>
        <div className="small">Demo mode: sample dataset (no keys required)</div>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panelHeader">
            <h2 className="panelTitle">Month Mosaic</h2>
          </div>
          <div className="panelBody">
            <MosaicView tiles={tiles} />
          </div>
        </section>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="panel">
            <div className="panelHeader">
              <h2 className="panelTitle">Recurring</h2>
            </div>
            <div className="panelBody">
              <RecurringPanel recurring={summary.recurring} />
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader">
              <h2 className="panelTitle">Next Actions</h2>
            </div>
            <div className="panelBody">
              <ActionsPanel actions={actions} />
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader">
              <h2 className="panelTitle">Bank APIs (scaffold)</h2>
            </div>
            <div className="panelBody">
              <div className="small">
                Plaid-first adapter layer is scaffolded in `packages/banking`. We keep CSV as the
                always-works fallback, and wire real bank sync once keys and compliance decisions
                are in place.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

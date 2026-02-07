import { readFile } from 'node:fs/promises';
import path from 'node:path';

export default async function PrizeLedgerPage() {
  const filePath = path.join(process.cwd(), 'docs', 'PRIZE_MONEY_LEDGER.md');
  let text = '';
  try {
    text = await readFile(filePath, 'utf8');
  } catch {
    text = `Missing docs/PRIZE_MONEY_LEDGER.md`;
  }

  return (
    <main className="container" style={{ maxWidth: 980 }}>
      <div className="header" style={{ marginBottom: 10 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 22 }}>
            Prize Money Ledger
          </h1>
          <div className="small">Rendered from docs/PRIZE_MONEY_LEDGER.md (read-only).</div>
        </div>
      </div>

      <pre
        className="small"
        style={{
          whiteSpace: 'pre-wrap',
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          padding: 16,
          margin: 0,
        }}
      >
        {text}
      </pre>
    </main>
  );
}

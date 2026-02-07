import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DOC_FILENAME = 'PRIZE_MONEY_LEDGER.md';

/** Try docs/ at cwd (repo root) or two levels up from cwd (when cwd is apps/web). */
async function readLedgerDoc(): Promise<string> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'docs', DOC_FILENAME),
    path.join(cwd, '..', '..', 'docs', DOC_FILENAME),
  ].map((p) => path.resolve(p));
  for (const filePath of candidates) {
    try {
      return await readFile(filePath, 'utf8');
    } catch {
      continue;
    }
  }
  return `Missing docs/${DOC_FILENAME}`;
}

export default async function PrizeLedgerPage() {
  const text = await readLedgerDoc();

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

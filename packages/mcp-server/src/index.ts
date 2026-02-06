import { parseTransactionsCsv, recommendActions, summarizeTransactions } from '@mosaicledger/core';

// Scaffold: minimal stdio server placeholder.
// We'll wire the actual MCP SDK once we pick the exact SDK/runtime.
async function main() {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  const input = Buffer.concat(chunks).toString('utf8').trim();

  if (!input) {
    process.stdout.write(JSON.stringify({ ok: true, message: 'mcp-server scaffold' }));
    return;
  }

  // Extremely small demo: accept { csv, goal } and return analysis.
  const req = JSON.parse(input) as { csv: string; goal?: any };
  const txns = parseTransactionsCsv(req.csv);
  const summary = summarizeTransactions(txns);
  const actions = req.goal ? recommendActions(summary, req.goal) : [];

  process.stdout.write(JSON.stringify({ summary, actions }));
}

main().catch((err) => {
  process.stderr.write(String(err));
  process.exit(1);
});

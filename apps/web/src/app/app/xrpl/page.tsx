'use client';

import * as React from 'react';
import { getDemoTransactions } from '@mosaicledger/banking';
import { normalizeRawTransactions } from '@mosaicledger/core';
import type { RoundupResult } from '@mosaicledger/xrpl';
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { useFlags } from '../../../lib/flags-client';

type ReceiptState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; receipt: RoundupResult }
  | { status: 'error'; error: string };

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

function computeRoundupUsdFromDemo(): { spendUsd: number; roundupUsd: number; txCount: number } {
  const raw = getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo', spendOnly: true });

  let spend = 0;
  let roundup = 0;
  for (const t of txns) {
    const amt = Number(t.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    spend += amt;
    roundup += Math.ceil(amt) - amt;
  }
  return { spendUsd: spend, roundupUsd: roundup, txCount: txns.length };
}

export default function XrplPage() {
  const { flags } = useFlags();
  const [receipt, setReceipt] = React.useState<ReceiptState>({ status: 'idle' });

  const roundups = React.useMemo(() => computeRoundupUsdFromDemo(), []);
  const amountXrp = React.useMemo(() => {
    // Demo math: assume 1 XRP ~= 1 USD to keep deterministic and explainable.
    return roundups.roundupUsd;
  }, [roundups.roundupUsd]);

  const send = React.useCallback(async () => {
    setReceipt({ status: 'loading' });
    try {
      const resp = await fetch('/api/xrpl/send-roundup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amountXrp,
          memo: 'mosaicledger_roundup_demo',
          mode: 'simulate',
        }),
      });
      const json = (await resp.json()) as unknown;
      if (!resp.ok || !json || typeof json !== 'object')
        throw new Error(`XRPL failed (${resp.status})`);
      const ok = Boolean((json as { ok?: unknown }).ok);
      const rec = (json as { receipt?: unknown }).receipt;
      if (!ok || !rec || typeof rec !== 'object') throw new Error('XRPL failed');
      setReceipt({ status: 'done', receipt: rec as RoundupResult });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'XRPL failed';
      setReceipt({ status: 'error', error: msg });
    }
  }, [amountXrp]);

  if (!flags.xrplEnabled) {
    return (
      <div className="pageStack" style={{ maxWidth: 980 }}>
        <div className="pageHeader">
          <h1 className="pageTitle">XRPL</h1>
          <div className="pageMeta">
            <div className="pageTagline">Optional Ripple track demo</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>XRPL is disabled</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">Enable Settings → XRPL to view the demo flow.</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">XRPL Round-ups (Demo)</h1>
        <div className="pageMeta">
          <div className="pageTagline">Compute micro-savings, then simulate a receipt</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Round-up Summary</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="small">
              Demo mode uses the local transaction fixture set. Round-ups are deterministic: for
              each spend txn, round to the next whole dollar and sum the deltas.
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{roundups.txCount}</div>
                <div className="small">Transactions</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{formatMoney(roundups.spendUsd)}</div>
                <div className="small">Spend (USD)</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{formatMoney(roundups.roundupUsd)}</div>
                <div className="small">Round-up total (USD)</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{amountXrp.toFixed(6)} XRP</div>
                <div className="small">Amount to send (demo)</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="btn btnPrimary"
                type="button"
                onClick={() => void send()}
                disabled={receipt.status === 'loading'}
              >
                {receipt.status === 'loading' ? 'Simulating…' : 'Simulate Receipt'}
              </button>
              <div className="small" style={{ opacity: 0.9 }}>
                Seeds never touch the browser. This page is optional and cannot block the core demo.
              </div>
            </div>

            {receipt.status === 'error' ? (
              <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                {receipt.error}
              </div>
            ) : null}

            {receipt.status === 'done' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Receipt</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="small" style={{ display: 'grid', gap: 6 }}>
                    <div>
                      Mode: <b>{receipt.receipt.mode}</b>
                    </div>
                    <div>
                      Amount: <b>{receipt.receipt.amountXrp.toFixed(6)} XRP</b>
                    </div>
                    <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                      Tx hash: <b>{receipt.receipt.txHash}</b>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

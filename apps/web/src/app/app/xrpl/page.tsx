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
  | { status: 'done'; receipt: RoundupResult; explorerUrl?: string }
  | { status: 'error'; error: string };

type XrplHealth =
  | { ok: true; configured: boolean; rpcHost: string | null; destinationConfigured: boolean }
  | { ok: false; error?: string };

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
  const [health, setHealth] = React.useState<XrplHealth | null>(null);
  const [mode, setMode] = React.useState<'simulate' | 'send'>('simulate');

  const roundups = React.useMemo(() => computeRoundupUsdFromDemo(), []);
  const amountXrp = React.useMemo(() => {
    // Demo math: assume 1 XRP ~= 1 USD to keep deterministic and explainable.
    return roundups.roundupUsd;
  }, [roundups.roundupUsd]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await fetch('/api/xrpl/health', { method: 'GET' });
        const json = (await resp.json()) as unknown;
        if (!alive) return;
        if (
          json &&
          typeof json === 'object' &&
          'ok' in json &&
          typeof (json as { ok: unknown }).ok === 'boolean'
        ) {
          setHealth(json as XrplHealth);
        } else {
          setHealth({ ok: false, error: 'invalid_response' });
        }
      } catch {
        if (!alive) return;
        setHealth({ ok: false, error: 'health_failed' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const send = React.useCallback(async () => {
    setReceipt({ status: 'loading' });
    try {
      const memo = [
        'mosaicledger_roundup',
        `txns=${roundups.txCount}`,
        `spend_usd=${roundups.spendUsd.toFixed(2)}`,
        `roundup_usd=${roundups.roundupUsd.toFixed(2)}`,
        `ts=${new Date().toISOString()}`,
      ].join('|');

      const resp = await fetch('/api/xrpl/send-roundup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amountXrp,
          memo,
          mode,
        }),
      });
      const json = (await resp.json()) as unknown;
      if (!resp.ok || !json || typeof json !== 'object') {
        const apiError =
          json && typeof json === 'object' && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : null;
        throw new Error(apiError || `Transfer failed (${resp.status})`);
      }
      const ok = Boolean((json as { ok?: unknown }).ok);
      const rec = (json as { receipt?: unknown }).receipt;
      if (!ok || !rec || typeof rec !== 'object') {
        const apiError =
          json && typeof json === 'object' && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : null;
        throw new Error(apiError || 'Transfer failed');
      }
      const ex = (json as { explorerUrl?: unknown }).explorerUrl;
      const explorerUrl = typeof ex === 'string' ? ex : undefined;
      setReceipt({ status: 'done', receipt: rec as RoundupResult, explorerUrl });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Transfer failed';
      setReceipt({ status: 'error', error: msg });
    }
  }, [amountXrp, mode, roundups.roundupUsd, roundups.spendUsd, roundups.txCount]);

  if (!flags.xrplEnabled) {
    return (
      <div className="pageStack" style={{ maxWidth: 980 }}>
        <div className="pageHeader">
          <h1 className="pageTitle">Round-ups</h1>
          <div className="pageMeta">
            <div className="pageTagline">Optional round-up sweep demo (simulate-first)</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Round-ups are disabled</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">
              Enable Runtime Flags → Round-up Transfers to view the demo flow.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Round-ups</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            Compute micro-savings. Simulate a receipt, or send a real Testnet Payment.
          </div>
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
                {receipt.status === 'loading'
                  ? mode === 'send'
                    ? 'Sending…'
                    : 'Simulating…'
                  : mode === 'send'
                    ? 'Send to Testnet'
                    : 'Simulate Receipt'}
              </button>
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => setMode((m) => (m === 'simulate' ? 'send' : 'simulate'))}
                disabled={receipt.status === 'loading'}
              >
                Mode: {mode === 'simulate' ? 'SIMULATE' : 'TESTNET'}
              </button>
              <div className="small" style={{ opacity: 0.9 }}>
                Seeds never touch the browser. If Testnet is not configured, this will error and you
                can switch back to Simulate.
              </div>
            </div>

            {health ? (
              <div className="small" style={{ opacity: 0.92 }}>
                Status:{' '}
                {health.ok ? (
                  health.configured ? (
                    <>
                      <b>configured</b> (RPC: {health.rpcHost ?? 'unknown'}
                      {health.destinationConfigured ? ', destination set' : ', destination = self'})
                    </>
                  ) : (
                    <>
                      <b>simulate-only</b> (configure server-side credentials to enable Testnet
                      sends)
                    </>
                  )
                ) : (
                  <b>unknown</b>
                )}
              </div>
            ) : null}

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
                    {receipt.explorerUrl ? (
                      <div>
                        Explorer:{' '}
                        <a href={receipt.explorerUrl} target="_blank" rel="noreferrer">
                          Open on Testnet Explorer
                        </a>
                      </div>
                    ) : null}
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

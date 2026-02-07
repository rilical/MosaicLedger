import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { simulateRoundupPayment } from '@mosaicledger/xrpl';
import type { Payment } from 'xrpl';

const BodySchema = z.object({
  amountXrp: z.number().finite().nonnegative(),
  memo: z.string().max(2000).default('mosaicledger_demo'),
  mode: z.enum(['simulate', 'send']).default('simulate'),
});

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** XRPL allows at most 6 decimal places for XRP; round to avoid xrpToDrops precision errors. */
function roundXrpTo6(amountXrp: number): number {
  return Math.round(amountXrp * 1e6) / 1e6;
}

function explorerUrl(txHash: string): string {
  return `https://testnet.xrpl.org/transactions/${encodeURIComponent(txHash)}`;
}

function safeHexMemo(input: string): string {
  // XRPL MemoData is hex. Keep this bounded so we never exceed size limits.
  const s = input.trim().slice(0, 512);
  const bytes = Buffer.from(s, 'utf8');
  return bytes.toString('hex').toUpperCase();
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const amountXrp = roundXrpTo6(clamp(parsed.data.amountXrp, 0, 50)); // demo-safe cap (testnet only)
  const memo = parsed.data.memo;

  if (parsed.data.mode === 'simulate') {
    const result = await simulateRoundupPayment({ amountXrp, memo });
    return NextResponse.json({ ok: true, receipt: result });
  }

  // Real send (XRPL Testnet). Seed stays server-side only.
  const seed = process.env.XRPL_TESTNET_SEED?.trim();
  const rpcUrl = process.env.XRPL_RPC_URL?.trim();
  if (!seed || !rpcUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: 'xrpl_not_configured (set XRPL_TESTNET_SEED and XRPL_RPC_URL)',
      },
      { status: 400 },
    );
  }
  if (!(amountXrp > 0)) {
    return NextResponse.json({ ok: false, error: 'amount_must_be_positive' }, { status: 400 });
  }

  try {
    const { Client, Wallet, xrpToDrops } = await import('xrpl');

    const client = new Client(rpcUrl);
    const connectTimeout = setTimeout(() => {
      // best-effort: if connect hangs, close the socket so Next doesn't keep it alive
      try {
        void client.disconnect();
      } catch {
        // ignore
      }
    }, 9000);

    try {
      await client.connect();
      clearTimeout(connectTimeout);

      const wallet = Wallet.fromSeed(seed);
      const destination = (process.env.XRPL_DESTINATION || wallet.address).trim();

      const tx: Payment = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: destination,
        Amount: xrpToDrops(amountXrp),
        ...(memo
          ? {
              Memos: [
                {
                  Memo: {
                    MemoType: safeHexMemo('mosaicledger'),
                    MemoData: safeHexMemo(memo),
                  },
                },
              ],
            }
          : {}),
      };

      const prepared = await client.autofill(tx);
      const signed = wallet.sign(prepared);
      await client.submitAndWait(signed.tx_blob, { failHard: true });

      const txHash = signed.hash;

      return NextResponse.json({
        ok: true,
        receipt: { mode: 'testnet', amountXrp, txHash },
        explorerUrl: explorerUrl(txHash),
      });
    } finally {
      try {
        await client.disconnect();
      } catch {
        // ignore
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'xrpl_send_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

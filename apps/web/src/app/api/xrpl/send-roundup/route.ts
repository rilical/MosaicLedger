import { NextResponse } from 'next/server';
import { z } from 'zod';
import { simulateRoundupPayment } from '@mosaicledger/xrpl';

const BodySchema = z.object({
  amountXrp: z.number().finite().nonnegative(),
  memo: z.string().max(2000).default('mosaicledger_demo'),
  mode: z.enum(['simulate', 'send']).default('simulate'),
});

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

  // Hackathon-safe: always provide a deterministic simulate path.
  // Real testnet send can be added behind env flags later (XRPL seed stays server-side only).
  const result = await simulateRoundupPayment({
    amountXrp: parsed.data.amountXrp,
    memo: parsed.data.memo,
  });

  return NextResponse.json({ ok: true, receipt: result });
}

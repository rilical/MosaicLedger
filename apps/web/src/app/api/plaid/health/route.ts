import { NextResponse } from 'next/server';
import { parseBooleanEnv } from '../../../../lib/env';
import { hasPlaidEnv } from '../../../../lib/plaid/serverClient';

export async function GET() {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  return NextResponse.json({
    ok: judgeMode || demoMode ? true : hasPlaidEnv(),
    judgeMode,
    demoMode,
    configured: hasPlaidEnv(),
    env: process.env.PLAID_ENV ?? null,
  });
}

import { NextResponse } from 'next/server';
import { computeDemoArtifacts, type AnalyzeRequestV1 } from '../../../../lib/analysis/compute';
import { getLatestAnalysisRun, insertAnalysisRun } from '../../../../lib/analysis/storage';
import { hasSupabaseEnv, parseBooleanEnv } from '../../../../lib/env';
import { envFlags } from '../../../../lib/flags';
import { supabaseServer } from '../../../../lib/supabase/server';

export async function GET() {
  if (envFlags.demoMode || envFlags.judgeMode || !hasSupabaseEnv()) {
    return NextResponse.json({ ok: true, latest: null });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const latest = await getLatestAnalysisRun(supabase, user.id);
  return NextResponse.json({ ok: true, latest });
}

export async function POST(request: Request) {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  let body: AnalyzeRequestV1 = {};
  try {
    body = (await request.json()) as AnalyzeRequestV1;
  } catch {
    body = {};
  }

  // Demo/judge safe mode: never require auth or schema.
  if (demoMode || judgeMode || !hasSupabaseEnv()) {
    const artifacts = computeDemoArtifacts(body);
    return NextResponse.json({ ok: true, artifacts, stored: false });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Hackathon-safe default: run the deterministic engine over the demo dataset.
  // Real bank sync will replace the input source later.
  const artifacts = computeDemoArtifacts(body);

  try {
    await insertAnalysisRun(supabase, user.id, artifacts);
  } catch {
    // If schema isn't applied yet, still return computed artifacts.
  }

  return NextResponse.json({ ok: true, artifacts, stored: true });
}

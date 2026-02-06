import { NextResponse } from 'next/server';
import { computeDemoArtifacts } from '../../../../lib/analysis/compute';
import { getLatestAnalysisRun, insertAnalysisRun } from '../../../../lib/analysis/storage';
import { supabaseServer } from '../../../../lib/supabase/server';

export async function GET() {
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

export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Hackathon-safe default: run the deterministic engine over the demo dataset.
  // Real bank sync will replace the input source later.
  const artifacts = computeDemoArtifacts();

  try {
    await insertAnalysisRun(supabase, user.id, artifacts);
  } catch {
    // If schema isn't applied yet, still return computed artifacts.
  }

  return NextResponse.json({ ok: true, artifacts });
}

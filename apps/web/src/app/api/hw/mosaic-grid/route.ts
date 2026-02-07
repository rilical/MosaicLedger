import { NextResponse } from 'next/server';
import { computeDemoArtifacts } from '../../../../lib/analysis/compute';
import { hasSupabaseEnv, parseBooleanEnv } from '../../../../lib/env';
import { getLatestAnalysisRun } from '../../../../lib/analysis/storage';
import { supabaseServer } from '../../../../lib/supabase/server';
import { quantizeTilesToGrid } from '../../../../lib/hw/mosaicGrid';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const w = Number(url.searchParams.get('w') ?? '10');
  const h = Number(url.searchParams.get('h') ?? '10');

  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  // Demo-safe: always works without auth or DB.
  if (judgeMode || demoMode || !hasSupabaseEnv()) {
    const artifacts = computeDemoArtifacts();
    const grid = quantizeTilesToGrid({ tiles: artifacts.mosaic.tiles, w, h });
    return NextResponse.json({ ok: true, ...grid, source: 'demo' as const });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const latest = await getLatestAnalysisRun(supabase, user.id);
  if (!latest) {
    const artifacts = computeDemoArtifacts();
    const grid = quantizeTilesToGrid({ tiles: artifacts.mosaic.tiles, w, h });
    return NextResponse.json({ ok: true, ...grid, source: 'demo' as const });
  }

  const grid = quantizeTilesToGrid({ tiles: latest.mosaic.tiles, w, h });
  return NextResponse.json({ ok: true, ...grid, source: 'latest' as const });
}

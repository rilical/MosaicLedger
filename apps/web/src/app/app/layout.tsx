import { AppNav } from '../../components/AppNav';
import { AppHeader } from '../../components/AppHeader';
import { envFlags } from '../../lib/flags';
import { hasSupabaseEnv } from '../../lib/env';
import { supabaseServer } from '../../lib/supabase/server';

async function ensureProfile(): Promise<void> {
  if (envFlags.demoMode || envFlags.judgeMode) return;
  if (!hasSupabaseEnv()) return;

  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // RLS allows the user to upsert their own row.
    await supabase.from('user_profiles').upsert({ user_id: user.id }, { onConflict: 'user_id' });
  } catch {
    // Profile creation is non-blocking for hackathon MVP.
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureProfile();

  return (
    <div className="appShell">
      <nav className="sideNav" aria-label="Primary">
        <div className="navTitle">MosaicLedger</div>
        <div className="navSubtitle" style={{ marginBottom: 12 }}>
          Assembled, explainable budget planning.
        </div>
        <AppNav demoMode={envFlags.demoMode} />

        <div style={{ marginTop: 16 }}>
          <div className="small">
            Tip: judges should open Settings and toggle Judge Mode + Demo Mode if anything external
            flakes.
          </div>
        </div>
      </nav>

      <div className="mainArea">
        <AppHeader />

        {children}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { Badge } from '../../components/ui';
import { envFlags } from '../../lib/flags';
import { SignOutButton } from '../../components/Auth/SignOutButton';
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
        <div className="small" style={{ marginBottom: 12 }}>
          Assembled, explainable budget planning.
        </div>
        <div className="navList">
          <Link className="navLink" href="/app">
            <span>Connect</span>
            {envFlags.demoMode ? <Badge tone="good">DEMO</Badge> : <Badge>LIVE</Badge>}
          </Link>
          <Link className="navLink" href="/app/mosaic?source=demo">
            <span>Mosaic</span>
            <Badge>v0</Badge>
          </Link>
          <Link className="navLink" href="/app/recurring?source=demo">
            <span>Recurring</span>
            <Badge>v0</Badge>
          </Link>
          <Link className="navLink" href="/app/plan?source=demo">
            <span>Plan</span>
            <Badge>v0</Badge>
          </Link>
          <Link className="navLink" href="/app/export?source=demo">
            <span>Export</span>
            <Badge>soon</Badge>
          </Link>
          <Link className="navLink" href="/app/settings">
            <span>Settings</span>
            <Badge>v0</Badge>
          </Link>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="small">
            Tip: judges should open Settings and toggle Judge Mode + Demo Mode if anything external
            flakes.
          </div>
        </div>
      </nav>

      <div className="mainArea">
        <div className="topBar">
          <div>
            <div style={{ fontWeight: 750 }}>App</div>
            <div className="small">Primary UI is the Mosaic mural.</div>
          </div>
          <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
            <Link className="btn btnGhost" href="/login">
              Login
            </Link>
            <SignOutButton />
            <SettingsDrawer />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

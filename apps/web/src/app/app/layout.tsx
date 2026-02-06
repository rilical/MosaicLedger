import Link from 'next/link';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { Badge } from '../../components/ui';
import { envFlags } from '../../lib/flags';

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
          <span className="navLink" style={{ opacity: 0.6 }}>
            <span>Recurring</span>
            <Badge>soon</Badge>
          </span>
          <span className="navLink" style={{ opacity: 0.6 }}>
            <span>Plan</span>
            <Badge>soon</Badge>
          </span>
          <span className="navLink" style={{ opacity: 0.6 }}>
            <span>Export</span>
            <Badge>soon</Badge>
          </span>
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
            <SettingsDrawer />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

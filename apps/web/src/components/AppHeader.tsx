'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingsDrawer } from './SettingsDrawer';
import { SignOutButton } from './Auth/SignOutButton';

const sectionMeta: Array<{ match: string; title: string; subtitle: string }> = [
  { match: '/app/mosaic', title: 'Mosaic', subtitle: 'Primary UI is the Mosaic mural.' },
  { match: '/app/recurring', title: 'Recurring', subtitle: 'Recurring detection and forecasts.' },
  { match: '/app/plan', title: 'Plan', subtitle: 'Ranked actions with quantified savings.' },
  { match: '/app/export', title: 'Export', subtitle: 'Download a poster summary.' },
  { match: '/app/settings', title: 'Settings', subtitle: 'Runtime flags and overrides.' },
  { match: '/app/bank', title: 'Connect Bank', subtitle: 'Plaid scaffolding for live sync.' },
  { match: '/app', title: 'Connect', subtitle: 'Choose a data source to begin.' },
];

function getSection(pathname: string) {
  return (
    sectionMeta.find((item) => pathname.startsWith(item.match)) ??
    sectionMeta[sectionMeta.length - 1] ?? {
      match: '/app',
      title: 'Connect',
      subtitle: 'Choose a data source to begin.',
    }
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const section = getSection(pathname);

  return (
    <div className="topBar">
      <div>
        <div style={{ fontWeight: 700 }}>{section.title}</div>
        <div className="small">{section.subtitle}</div>
      </div>
      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
        <Link className="btn btnGhost" href="/login">
          Login
        </Link>
        <SignOutButton />
        <SettingsDrawer />
      </div>
    </div>
  );
}

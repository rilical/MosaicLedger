'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingsDrawer } from './SettingsDrawer';
import { SignOutButton } from './Auth/SignOutButton';
import { useFlags } from '../lib/flags-client';

const sectionMeta: Array<{ match: string; title: string; subtitle: string }> = [
  {
    match: '/app/capital-one',
    title: 'Locations & Bills',
    subtitle: 'ATMs, branches, bills, and payments (connector).',
  },
  { match: '/app/mosaic', title: 'Mosaic', subtitle: 'Primary UI is the Mosaic mural.' },
  { match: '/app/recurring', title: 'Recurring', subtitle: 'Recurring detection and forecasts.' },
  { match: '/app/plan', title: 'Actions', subtitle: 'Ranked actions with quantified savings.' },
  { match: '/app/ops', title: 'Ops', subtitle: 'Analyst briefs + memo (AI optional).' },
  { match: '/app/export', title: 'Export', subtitle: 'Download a poster summary.' },
  {
    match: '/app/coach',
    title: 'Coach',
    subtitle: 'Tool calling + multi-model handoff (optional).',
  },
  { match: '/app/evidence', title: 'Evidence', subtitle: 'Prize checklist and integration proof.' },
  { match: '/app/settings', title: 'Settings', subtitle: 'Runtime flags and overrides.' },
  { match: '/app/bank', title: 'Connect Bank', subtitle: 'Plaid scaffolding for live sync.' },
  { match: '/app/xrpl', title: 'Round-ups', subtitle: 'Simulate or send a sweep on Testnet.' },
  { match: '/app', title: 'Dashboard', subtitle: 'Cashflow, risk, and next actions in one view.' },
];

function getSection(pathname: string) {
  return (
    sectionMeta.find((item) => pathname.startsWith(item.match)) ??
    sectionMeta[sectionMeta.length - 1] ?? {
      match: '/app',
      title: 'Dashboard',
      subtitle: 'Cashflow, risk, and next actions in one view.',
    }
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const section = getSection(pathname);
  const { flags } = useFlags();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    // Check if user is logged in by checking for Supabase session
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setIsLoggedIn(!!data?.user);
      } catch {
        setIsLoggedIn(false);
      }
    };

    // If in demo mode, assume not logged in
    if (flags.demoMode) {
      setIsLoggedIn(false);
    } else {
      void checkAuth();
    }
  }, [flags.demoMode]);

  return (
    <div className="topBar">
      <div>
        <div style={{ fontWeight: 700 }}>{section.title}</div>
        <div className="small">{section.subtitle}</div>
      </div>
      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
        {!isLoggedIn && (
          <Link className="btn btnGhost" href="/login">
            Login
          </Link>
        )}
        {isLoggedIn && <SignOutButton />}
        <SettingsDrawer />
      </div>
    </div>
  );
}

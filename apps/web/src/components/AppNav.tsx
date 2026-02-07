'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from './ui';
import { useFlags } from '../lib/flags-client';

const navItemsBase = [
  { href: '/app', label: 'Start' },
  { href: '/app/mosaic', label: 'Mosaic' },
  { href: '/app/recurring', label: 'Recurring' },
  { href: '/app/plan', label: 'Plan' },
  { href: '/app/ops', label: 'Ops' },
  { href: '/app/coach', label: 'Coach' },
  { href: '/app/export', label: 'Export' },
  { href: '/app/evidence', label: 'Evidence' },
  { href: '/app/settings', label: 'Settings' },
];

type AppNavProps = {
  demoMode: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ demoMode }: AppNavProps) {
  const pathname = usePathname();
  const { flags } = useFlags();

  const navItems = flags.xrplEnabled
    ? [
        ...navItemsBase.slice(0, 5),
        { href: '/app/xrpl', label: 'XRPL', badge: 'opt' },
        ...navItemsBase.slice(5),
      ]
    : navItemsBase;

  return (
    <div className="navList">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            className={`navLink${active ? ' navLinkActive' : ''}`}
            href={item.href}
            aria-current={active ? 'page' : undefined}
          >
            <span>{item.label}</span>
            {item.href === '/app' ? (
              <Badge tone={demoMode ? 'good' : 'neutral'}>{demoMode ? 'DEMO' : 'LIVE'}</Badge>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

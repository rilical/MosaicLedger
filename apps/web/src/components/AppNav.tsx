'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from './ui';
import { useFlags } from '../lib/flags-client';

const navItemsBase = [
  { href: '/app', label: 'Connect', badge: 'LIVE' },
  { href: '/app/mosaic', label: 'Mosaic', badge: 'v0' },
  { href: '/app/ops', label: 'Ops', badge: 'v0' },
  { href: '/app/recurring', label: 'Recurring', badge: 'v0' },
  { href: '/app/plan', label: 'Plan', badge: 'v0' },
  { href: '/app/export', label: 'Export', badge: 'soon' },
  { href: '/app/settings', label: 'Settings', badge: 'v0' },
  { href: '/game', label: 'Play Minesweeper', badge: '180s' },
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
        const badgeText = item.href === '/app' ? (demoMode ? 'DEMO' : 'LIVE') : item.badge;

        return (
          <Link
            key={item.href}
            className={`navLink${active ? ' navLinkActive' : ''}`}
            href={item.href}
            aria-current={active ? 'page' : undefined}
          >
            <span>{item.label}</span>
            <Badge tone={item.href === '/app' && demoMode ? 'good' : 'neutral'}>{badgeText}</Badge>
          </Link>
        );
      })}
    </div>
  );
}

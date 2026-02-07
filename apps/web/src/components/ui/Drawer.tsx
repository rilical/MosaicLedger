'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
};

export function Drawer(props: DrawerProps) {
  const { open, onOpenChange, title, children } = props;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  const content = (
    <div className="drawerOverlay" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="drawerHeader">
          <div className="drawerTitle">{title}</div>
          <button className="iconBtn" onClick={() => onOpenChange(false)} aria-label="Close drawer">
            ✕
          </button>
        </div>
        <div className="drawerBody">{children}</div>
      </aside>
    </div>
  );

  return createPortal(content, document.body);
}

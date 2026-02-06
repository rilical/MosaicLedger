'use client';

import * as React from 'react';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
};

export function Drawer(props: DrawerProps) {
  const { open, onOpenChange, title, children } = props;

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
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
}

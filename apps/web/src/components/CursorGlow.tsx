'use client';

import * as React from 'react';

export function CursorGlow() {
  const glowRef = React.useRef<HTMLDivElement>(null);
  const target = React.useRef({ x: 0, y: 0 });
  const current = React.useRef({ x: 0, y: 0 });
  const rafId = React.useRef<number | null>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const onMove = (event: MouseEvent) => {
      target.current = { x: event.clientX, y: event.clientY };
      setActive(true);
    };

    const onLeave = () => {
      setActive(false);
    };

    const animate = () => {
      const node = glowRef.current;
      if (node) {
        current.current.x += (target.current.x - current.current.x) * 0.15;
        current.current.y += (target.current.y - current.current.y) * 0.15;
        node.style.transform = `translate3d(${current.current.x - 110}px, ${current.current.y - 110}px, 0)`;
      }
      rafId.current = window.requestAnimationFrame(animate);
    };

    rafId.current = window.requestAnimationFrame(animate);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, []);

  return <div ref={glowRef} className={`cursorGlow${active ? '' : ' cursorGlowHidden'}`} />;
}

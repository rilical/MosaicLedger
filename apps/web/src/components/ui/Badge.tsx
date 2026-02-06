import * as React from 'react';

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'good' | 'warn' },
) {
  const { className, tone = 'neutral', ...rest } = props;
  return (
    <span
      {...rest}
      className={cn(
        'badge',
        tone === 'good' && 'badgeGood',
        tone === 'warn' && 'badgeWarn',
        className,
      )}
    />
  );
}

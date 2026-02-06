import * as React from 'react';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant },
) {
  const { className, variant = 'default', ...rest } = props;
  return (
    <button
      {...rest}
      className={cn(
        'btn',
        variant === 'primary' && 'btnPrimary',
        variant === 'ghost' && 'btnGhost',
        variant === 'danger' && 'btnDanger',
        className,
      )}
    />
  );
}

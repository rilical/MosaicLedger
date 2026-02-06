import * as React from 'react';

export function Tooltip(props: { content: string; children: React.ReactNode }) {
  const { content, children } = props;
  return (
    <span className="tooltip" title={content}>
      {children}
    </span>
  );
}

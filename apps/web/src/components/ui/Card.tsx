import * as React from 'react';

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <section {...rest} className={cn('panel', className)} />;
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn('panelHeader', className)} />;
}

export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props;
  return <h2 {...rest} className={cn('panelTitle', className)} />;
}

export function CardBody(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn('panelBody', className)} />;
}

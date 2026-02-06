export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LoggerOpts = {
  level?: LogLevel;
};

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(cur: LogLevel, want: LogLevel) {
  return levelRank[want] >= levelRank[cur];
}

function redact(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const copy: Record<string, unknown> = Array.isArray(value) ? {} : { ...(value as any) };
    // Redact common sensitive fields.
    for (const k of ['merchantRaw', 'amount', 'name', 'description', 'raw', 'row']) {
      if (k in copy) copy[k] = '[REDACTED]';
    }
    return copy;
  }
  return value;
}

export function createLogger(opts: LoggerOpts = {}) {
  const cur = opts.level ?? 'info';
  return {
    debug: (...args: unknown[]) => shouldLog(cur, 'debug') && console.debug(...args.map(redact)),
    info: (...args: unknown[]) => shouldLog(cur, 'info') && console.info(...args.map(redact)),
    warn: (...args: unknown[]) => shouldLog(cur, 'warn') && console.warn(...args.map(redact)),
    error: (...args: unknown[]) => shouldLog(cur, 'error') && console.error(...args.map(redact)),
  };
}

const levelRank = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
function shouldLog(cur, want) {
    return levelRank[want] >= levelRank[cur];
}
function redact(value) {
    if (Array.isArray(value)) {
        return value.map(redact);
    }
    if (value && typeof value === 'object') {
        const copy = { ...value };
        // Redact common sensitive fields.
        for (const k of ['merchantRaw', 'amount', 'name', 'description', 'raw', 'row']) {
            if (k in copy)
                copy[k] = '[REDACTED]';
        }
        return copy;
    }
    return value;
}
export function createLogger(opts = {}) {
    const cur = opts.level ?? 'info';
    return {
        debug: (...args) => shouldLog(cur, 'debug') && console.debug(...args.map(redact)),
        info: (...args) => shouldLog(cur, 'info') && console.info(...args.map(redact)),
        warn: (...args) => shouldLog(cur, 'warn') && console.warn(...args.map(redact)),
        error: (...args) => shouldLog(cur, 'error') && console.error(...args.map(redact)),
    };
}
//# sourceMappingURL=log.js.map
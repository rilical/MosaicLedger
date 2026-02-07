export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LoggerOpts = {
    level?: LogLevel;
};
export declare function createLogger(opts?: LoggerOpts): {
    debug: (...args: unknown[]) => false | void;
    info: (...args: unknown[]) => false | void;
    warn: (...args: unknown[]) => false | void;
    error: (...args: unknown[]) => false | void;
};
export {};
//# sourceMappingURL=log.d.ts.map
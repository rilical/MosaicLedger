'use client';

import * as React from 'react';
import { FLAG_KEYS, envFlags, type FlagKey, type Flags } from './flags';

const STORAGE_KEY = 'mosaicledger.flags.v1';

function safeParseOverrides(raw: string | null): Partial<Flags> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (v == null || typeof v !== 'object') return {};
    const obj = v as Record<string, unknown>;
    const out: Partial<Flags> = {};
    for (const k of FLAG_KEYS) {
      const val = obj[k];
      if (typeof val === 'boolean') out[k] = val;
    }
    return out;
  } catch {
    return {};
  }
}

function mergeFlags(base: Flags, overrides: Partial<Flags>): Flags {
  return { ...base, ...overrides };
}

export function useFlags(): {
  flags: Flags;
  setFlag: (key: FlagKey, value: boolean) => void;
  resetFlags: () => void;
} {
  const [overrides, setOverrides] = React.useState<Partial<Flags>>({});

  React.useEffect(() => {
    setOverrides(safeParseOverrides(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  const flags = React.useMemo(() => mergeFlags(envFlags, overrides), [overrides]);

  const setFlag = React.useCallback((key: FlagKey, value: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev, [key]: value };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetFlags = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setOverrides({});
  }, []);

  return { flags, setFlag, resetFlags };
}

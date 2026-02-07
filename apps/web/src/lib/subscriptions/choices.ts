'use client';

import * as React from 'react';
import { hasSupabaseEnv } from '../env';
import { supabaseBrowser } from '../supabase/browser';

export type SubscriptionChoice = 'keep' | 'cancel' | 'downgrade';

export type SubscriptionChoiceMap = Record<string, SubscriptionChoice>;

const STORAGE_KEY = 'mosaicledger.subscriptionChoices.v1';

function safeParse(raw: string | null): SubscriptionChoiceMap {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return {};
    const out: SubscriptionChoiceMap = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === 'keep' || val === 'cancel' || val === 'downgrade') out[k] = val;
    }
    return out;
  } catch {
    return {};
  }
}

async function bestEffortLoadFromDb(): Promise<SubscriptionChoiceMap | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const sb = supabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;

    const { data, error } = await sb
      .from('user_overrides')
      .select('key,value')
      .eq('kind', 'subscription_choice')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error) return null;

    const out: SubscriptionChoiceMap = {};
    for (const row of (data ?? []) as Array<{ key?: unknown; value?: unknown }>) {
      const key = typeof row.key === 'string' ? row.key : null;
      if (!key) continue;
      const v = row.value as unknown;
      const c =
        v && typeof v === 'object' && 'choice' in (v as Record<string, unknown>)
          ? (v as { choice?: unknown }).choice
          : null;
      if (c === 'keep' || c === 'cancel' || c === 'downgrade') out[key] = c;
    }
    return out;
  } catch {
    return null;
  }
}

async function bestEffortSaveToDb(merchant: string, choice: SubscriptionChoice): Promise<void> {
  if (!hasSupabaseEnv()) return;
  try {
    const sb = supabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    await sb.from('user_overrides').upsert(
      {
        user_id: user.id,
        kind: 'subscription_choice',
        key: merchant,
        value: { choice },
      },
      { onConflict: 'user_id,kind,key' },
    );
  } catch {
    // non-blocking
  }
}

export function useSubscriptionChoices(): {
  choices: SubscriptionChoiceMap;
  setChoice: (merchant: string, choice: SubscriptionChoice) => void;
  clearChoice: (merchant: string) => void;
} {
  const [choices, setChoices] = React.useState<SubscriptionChoiceMap>({});

  React.useEffect(() => {
    const local = safeParse(window.localStorage.getItem(STORAGE_KEY));
    setChoices(local);

    void (async () => {
      const fromDb = await bestEffortLoadFromDb();
      if (fromDb) {
        // DB wins over local for authenticated users.
        setChoices(fromDb);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromDb));
      }
    })();
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  }, [choices]);

  const setChoice = React.useCallback((merchant: string, choice: SubscriptionChoice) => {
    setChoices((prev) => {
      const next = { ...prev, [merchant]: choice };
      return next;
    });
    void bestEffortSaveToDb(merchant, choice);
  }, []);

  const clearChoice = React.useCallback((merchant: string) => {
    setChoices((prev) => {
      const next = { ...prev };
      delete next[merchant];
      return next;
    });
    // Hackathon-safe: we don't delete DB rows; update to keep local + DB simple.
  }, []);

  return { choices, setChoice, clearChoice };
}

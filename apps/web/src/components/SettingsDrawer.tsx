'use client';

import * as React from 'react';
import { useFlags } from '../lib/flags-client';
import { FLAG_KEYS, type FlagKey } from '../lib/flags';
import { Drawer } from './ui/Drawer';
import { Badge, Button, Tooltip } from './ui';

function forgetThisDevice() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('mosaicledger.')) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

function parseBoolean(input: string | undefined, defaultValue: boolean): boolean {
  if (input == null) return defaultValue;
  const v = input.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return defaultValue;
}

function resetDemoStateLocal() {
  try {
    window.localStorage.removeItem('mosaicledger.analysisSettings.v1');
    window.localStorage.removeItem('mosaicledger.planGoal.v1');
    window.localStorage.removeItem('mosaicledger.flags.v1');
  } catch {
    // ignore
  }
}

function labelFor(key: FlagKey): string {
  switch (key) {
    case 'judgeMode':
      return 'Judge Mode';
    case 'demoMode':
      return 'Demo Mode';
    case 'aiEnabled':
      return 'AI Explanations';
    case 'xrplEnabled':
      return 'XRPL';
    case 'plaidEnabled':
      return 'Plaid';
    default:
      return key satisfies never;
  }
}

function helpFor(key: FlagKey): string {
  switch (key) {
    case 'judgeMode':
      return 'Force the always-works path and reduce live dependencies during judging.';
    case 'demoMode':
      return 'Use local demo transactions and disable external calls.';
    case 'aiEnabled':
      return 'AI can rewrite explanations, but never change deterministic numbers.';
    case 'xrplEnabled':
      return 'Enable XRPL round-up scaffolding (optional).';
    case 'plaidEnabled':
      return 'Enable Plaid link/sync scaffolding (optional, keys required).';
    default:
      return key satisfies never;
  }
}

export function SettingsDrawer() {
  const [open, setOpen] = React.useState(false);
  const { flags, setFlag, resetFlags } = useFlags();
  const expoResetUiEnabled = parseBoolean(process.env.NEXT_PUBLIC_EXPO_RESET_ENABLED, false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Settings
      </Button>
      <Drawer open={open} onOpenChange={setOpen} title="Runtime Flags">
        <div style={{ display: 'grid', gap: 12 }}>
          {FLAG_KEYS.map((k) => (
            <div key={k} className="flagRow">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 650 }}>{labelFor(k)}</div>
                  <Badge tone={flags[k] ? 'good' : 'neutral'}>{flags[k] ? 'ON' : 'OFF'}</Badge>
                  {helpFor(k) ? (
                    <Tooltip content={helpFor(k)}>
                      <span className="helpDot" aria-label={helpFor(k)}>
                        ?
                      </span>
                    </Tooltip>
                  ) : null}
                </div>
                <div className="small">{helpFor(k)}</div>
              </div>

              <label className="switch" aria-label={`Toggle ${labelFor(k)}`}>
                <input
                  type="checkbox"
                  checked={Boolean(flags[k])}
                  onChange={(e) => setFlag(k, e.target.checked)}
                />
                <span className="switchTrack" />
              </label>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={resetFlags}>
                Reset
              </Button>
              {expoResetUiEnabled ? (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    // Force the always-works path for judges.
                    setFlag('demoMode', true);
                    setFlag('judgeMode', true);

                    // Clear local derived state.
                    resetDemoStateLocal();

                    // Best-effort: clear server-side cached analysis for this user (if enabled).
                    try {
                      await fetch('/api/admin/expo-reset', { method: 'POST' });
                    } catch {
                      // ignore
                    }

                    // Hard reload to ensure all hooks re-read localStorage defaults.
                    window.location.href = '/app/mosaic?source=demo';
                  }}
                >
                  Expo reset
                </Button>
              ) : null}
              <Button
                variant="danger"
                onClick={() => {
                  forgetThisDevice();
                  resetFlags();
                }}
              >
                Forget device
              </Button>
            </div>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>

          <div className="small">
            Overrides are stored in localStorage (no rebuild). Env vars still define the defaults.
            {expoResetUiEnabled ? (
              <div style={{ marginTop: 8 }}>
                Expo reset is enabled. It clears local demo state and (optionally) clears cached
                analysis server-side when `EXPO_RESET_ENABLED=1`.
              </div>
            ) : null}
          </div>
        </div>
      </Drawer>
    </>
  );
}

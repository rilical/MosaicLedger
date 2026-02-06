export type Flags = {
  judgeMode: boolean;
  demoMode: boolean;
  aiEnabled: boolean;
  xrplEnabled: boolean;
  plaidEnabled: boolean;
};

export const FLAG_KEYS = [
  'judgeMode',
  'demoMode',
  'aiEnabled',
  'xrplEnabled',
  'plaidEnabled',
] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

function parseBoolean(input: string | undefined, defaultValue: boolean): boolean {
  if (input == null) return defaultValue;
  const v = input.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return defaultValue;
}

// Env-backed defaults. In the UI we allow local overrides for judge/demo safety.
export const envFlags: Flags = {
  judgeMode: parseBoolean(process.env.NEXT_PUBLIC_JUDGE_MODE, false),
  demoMode: parseBoolean(process.env.NEXT_PUBLIC_DEMO_MODE, true),
  aiEnabled: parseBoolean(process.env.NEXT_PUBLIC_AI_ENABLED, false),
  xrplEnabled: parseBoolean(process.env.NEXT_PUBLIC_XRPL_ENABLED, false),
  plaidEnabled: parseBoolean(process.env.NEXT_PUBLIC_PLAID_ENABLED, false),
};

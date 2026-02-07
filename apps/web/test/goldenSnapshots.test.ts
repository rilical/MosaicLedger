import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { computeDemoArtifacts } from '../src/lib/analysis/compute';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, 'golden');

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = canonicalize(obj[k]);
  return out;
}

async function matchGolden(name: string, value: unknown): Promise<void> {
  const file = path.join(GOLDEN_DIR, `${name}.json`);
  const json = JSON.stringify(canonicalize(value), null, 2) + '\n';

  if (process.env.UPDATE_GOLDEN === '1') {
    await fs.mkdir(GOLDEN_DIR, { recursive: true });
    await fs.writeFile(file, json, 'utf8');
    return;
  }

  let expected: string;
  try {
    expected = await fs.readFile(file, 'utf8');
  } catch {
    throw new Error(`Missing golden file: ${file}. Re-run with UPDATE_GOLDEN=1 to generate.`);
  }

  expect(json).toBe(expected);
}

describe('QA-007 golden snapshots (demo analyze)', () => {
  beforeAll(() => {
    // Keep generatedAt stable so snapshots are meaningful.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T00:00:00.000Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('matches golden outputs (summary, recurring, actionPlan, mosaic)', async () => {
    const artifacts = computeDemoArtifacts();

    await matchGolden('summary', artifacts.summary);
    await matchGolden('recurring', artifacts.recurring);
    await matchGolden('actionPlan', artifacts.actionPlan);
    await matchGolden('mosaic', artifacts.mosaic);
  });
});

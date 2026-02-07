import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SECRET_ENV_NAMES = [
  // DB admin bypass key
  'SUPABASE_SERVICE_ROLE_KEY',
  // XRPL seed must never reach the client bundle
  'XRPL_TESTNET_SEED',
] as const;

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist') continue;
      out.push(...(await listFiles(full)));
      continue;
    }
    if (!e.isFile()) continue;
    out.push(full);
  }
  return out;
}

function isClientModule(contents: string): boolean {
  // We only care about the first non-empty statement.
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    return (
      t === "'use client';" ||
      t === '"use client";' ||
      t === '"use client";' ||
      t === "'use client'"
    );
  }
  return false;
}

async function main() {
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const webSrc = path.join(repoRoot, 'apps', 'web', 'src');

  const files = (await listFiles(webSrc)).filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));

  const violations: string[] = [];

  for (const f of files) {
    const contents = await readFile(f, 'utf8');
    const hits = SECRET_ENV_NAMES.filter((name) => contents.includes(name));
    if (!hits.length) continue;

    if (isClientModule(contents)) {
      violations.push(`${f} (client module references: ${hits.join(', ')})`);
      continue;
    }

    const rel = path.relative(repoRoot, f).replaceAll(path.sep, '/');
    if (rel.includes('/components/')) {
      violations.push(`${f} (components/ references: ${hits.join(', ')})`);
      continue;
    }
  }

  // Optional: check built client bundle if it exists.
  const nextStatic = path.join(repoRoot, 'apps', 'web', '.next', 'static');
  try {
    const s = await stat(nextStatic);
    if (s.isDirectory()) {
      // Only scan for secret *values*. Env var names can appear in dependency comments; that's not a leak.
      const builtFiles = await listFiles(nextStatic);
      for (const envName of SECRET_ENV_NAMES) {
        const value = process.env[envName];
        if (!value || value.length < 12) continue;
        for (const f of builtFiles) {
          if (!/\.(js|map)$/.test(f)) continue;
          const contents = await readFile(f, 'utf8');
          if (contents.includes(value)) {
            violations.push(`${f} (bundled output contains secret value for ${envName})`);
          }
        }
      }
    }
  } catch {
    // no build output; skip
  }

  if (violations.length) {
    console.error(`SECRET CHECK FAILED: sensitive env must never appear in client code.`);
    for (const v of violations) console.error(`- ${v}`);
    process.exit(1);
  }

  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

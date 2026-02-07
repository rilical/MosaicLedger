import { spawnSync } from 'node:child_process';

function hasCommand(cmd) {
  const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return res.status === 0;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  return res.status ?? 1;
}

// Hosted build environments (e.g. Dedalus) may install dependencies using Bun
// without having `pnpm` available. Dist artifacts are committed for deploy, so
// failing the install here would be counter-productive.
if (!hasCommand('pnpm')) {
  console.log('[postinstall] pnpm not found; skipping workspace build');
  process.exit(0);
}

const status = run('pnpm', [
  '-r',
  '--filter',
  '@mosaicledger/*',
  '--filter',
  '!@mosaicledger/web',
  '--filter',
  '!@mosaicledger/mobile',
  'build',
]);

// In hosted environments we want installs to succeed even if optional build
// tooling isn't present (or devDependencies weren't installed).
if (status !== 0) {
  const strict = process.env.MOSAICLEDGER_STRICT_POSTINSTALL === '1';
  if (strict) process.exit(status);
  console.warn(`[postinstall] workspace build failed (exit ${status}); continuing`);
  process.exit(0);
}


import { spawnSync } from 'node:child_process';

function hasCommand(cmd) {
  const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return res.status === 0;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// Hosted build environments (e.g. Dedalus) may install dependencies using Bun
// without having `pnpm` available. Dist artifacts are committed for deploy, so
// failing the install here would be counter-productive.
if (!hasCommand('pnpm')) {
  console.log('[postinstall] pnpm not found; skipping workspace build');
  process.exit(0);
}

run('pnpm', [
  '-r',
  '--filter',
  '@mosaicledger/*',
  '--filter',
  '!@mosaicledger/web',
  '--filter',
  '!@mosaicledger/mobile',
  'build',
]);


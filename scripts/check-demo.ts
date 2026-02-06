import { computeDemoArtifacts } from '../apps/web/src/lib/analysis/compute';

async function main() {
  const artifacts = computeDemoArtifacts();
  const tiles = artifacts.mosaic.tiles;

  if (tiles.length === 0) {
    console.error('DEMO CHECK FAILED: no tiles generated');
    process.exit(1);
  }

  if (artifacts.recurring.length === 0) {
    console.error('DEMO CHECK FAILED: expected at least 1 recurring pattern');
    process.exit(1);
  }

  const total = tiles.reduce((acc, t) => acc + t.value, 0);
  if (total <= 0) {
    console.error('DEMO CHECK FAILED: non-positive total');
    process.exit(1);
  }

  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';

const LIMIT = 15 * 1024; // 15KB

const BUNDLE_DIR = path.join(process.cwd(), 'apps/web/public/game');
const FILES = ['index.html', 'style.css', 'game.js'] as const;

function isImageLike(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.endsWith('.png') ||
    n.endsWith('.jpg') ||
    n.endsWith('.jpeg') ||
    n.endsWith('.gif') ||
    n.endsWith('.webp') ||
    n.endsWith('.svg') ||
    n.endsWith('.ico')
  );
}

async function main() {
  // Ensure the bundle folder exists and doesn't contain images.
  const entries = await fs.readdir(BUNDLE_DIR);
  const images = entries.filter(isImageLike);
  if (images.length) {
    throw new Error(`Image files not allowed in bundle: ${images.join(', ')}`);
  }

  const stats = await Promise.all(FILES.map((f) => fs.stat(path.join(BUNDLE_DIR, f))));
  const total = stats.reduce((sum, s) => sum + s.size, 0);

  const report = {
    dir: BUNDLE_DIR,
    bytes: {
      html: stats[0].size,
      css: stats[1].size,
      js: stats[2].size,
      total,
      limit: LIMIT,
      ok: total <= LIMIT,
    },
  };

  console.log(
    `Game bundle size (HTML+JS+CSS): ${report.bytes.total} bytes (limit ${report.bytes.limit})`,
  );
  console.log(JSON.stringify(report, null, 2));

  if (!report.bytes.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

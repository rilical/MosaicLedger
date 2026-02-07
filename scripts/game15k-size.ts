import path from 'node:path';
import fs from 'node:fs/promises';

const LIMIT = 15 * 1024; // 15KB

const FILE = path.join(process.cwd(), 'apps/web/public/game.html');

async function main() {
  const stat = await fs.stat(FILE);
  const total = stat.size;

  const report = {
    file: FILE,
    bytes: {
      total,
      limit: LIMIT,
      ok: total <= LIMIT,
    },
  };

  console.log(
    `Minesweeper size (game.html): ${report.bytes.total} bytes (limit ${report.bytes.limit})`,
  );
  console.log(JSON.stringify(report, null, 2));

  if (!report.bytes.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

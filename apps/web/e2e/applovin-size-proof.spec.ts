import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test('AppLovin size proof: game bundle stays under 15KB (HTML+JS+CSS)', async ({ page }) => {
  const dir = path.join(process.cwd(), 'public/game');
  const files = ['index.html', 'style.css', 'game.js'] as const;
  const limit = 15 * 1024;

  const stats = await Promise.all(files.map((f) => fs.stat(path.join(dir, f))));
  const total = stats.reduce((sum, s) => sum + s.size, 0);

  expect(total).toBeLessThanOrEqual(limit);

  const report = {
    dir,
    bytes: {
      html: stats[0].size,
      css: stats[1].size,
      js: stats[2].size,
      total,
      limit,
      ok: total <= limit,
    },
  };

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>AppLovin size proof</title>
  <style>
    body{margin:0;background:#0b1022;color:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    .wrap{padding:24px}
    h1{margin:0 0 14px;font-size:18px}
    pre{margin:0;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);overflow:auto}
    .ok{color:#22c55e;font-weight:700}
  </style></head>
  <body><div class="wrap">
    <h1>Game bundle size proof: <span class="ok">${report.bytes.ok ? 'OK' : 'FAIL'}</span></h1>
    <pre>${JSON.stringify(report, null, 2)}</pre>
  </div></body></html>`;

  await page.setViewportSize({ width: 920, height: 520 });
  await page.setContent(html, { waitUntil: 'load' });

  // Optional evidence capture: write a screenshot file under docs/assets for submissions.
  if (process.env.CAPTURE_EVIDENCE === '1') {
    await page.screenshot({ path: '../../docs/assets/applovin-size-proof.png', fullPage: true });
  }
});

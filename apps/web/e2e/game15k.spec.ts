import { test, expect, devices } from '@playwright/test';

const iphone = devices['iPhone 12'];
// Use iPhone viewport/UA on Chromium (CI only installs Chromium).
test.use({
  viewport: iphone.viewport,
  userAgent: iphone.userAgent,
  deviceScaleFactor: iphone.deviceScaleFactor,
  isMobile: iphone.isMobile,
  hasTouch: iphone.hasTouch,
});

test('game loads and score changes (mobile viewport)', async ({ page }) => {
  await page.goto('/game');

  // Start screen renders (no auth required).
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#start')).toBeVisible();

  await page.locator('#start').click();
  await expect(page.locator('#overlay')).toBeHidden();

  const score = page.locator('#score');
  await expect(score).toHaveText('0');

  // Tap three cells inside the grid (deterministic session seed).
  const layout = await page.evaluate(() => {
    const GW = 10;
    const GH = 14;
    const hud = document.getElementById('hud');
    const hudH = hud ? hud.getBoundingClientRect().height : 0;
    const pad = 14;
    const top = hudH + pad;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const availW = w - pad * 2;
    const availH = h - top - pad;
    const s = Math.max(12, Math.floor(Math.min(availW / GW, availH / GH)));
    const ox = Math.floor((w - s * GW) / 2);
    const oy = Math.floor(top + (availH - s * GH) / 2);
    return { ox, oy, s };
  });

  const tapCell = async (col: number, row: number) => {
    const x = layout.ox + col * layout.s + layout.s / 2;
    const y = layout.oy + row * layout.s + layout.s / 2;
    await page.touchscreen.tap(x, y);
  };

  await tapCell(2, 2);
  await expect(score).not.toHaveText('0');

  await tapCell(6, 7);
  await tapCell(8, 10);
});

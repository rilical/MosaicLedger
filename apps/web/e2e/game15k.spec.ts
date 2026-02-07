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

test('minesweeper loads and timer starts (mobile viewport)', async ({ page }) => {
  await page.goto('/game?seed=e2e');

  await expect(page.locator('#status')).toHaveText('READY');
  await expect(page.locator('#grid')).toBeVisible();
  await expect(page.locator('#grid .c')).toHaveCount(100);

  const left = page.locator('#left');
  await expect(left).toHaveText('85');

  // First tap starts the timer and should never hit a mine (protects cell + neighbors).
  await page.locator('#grid .c').first().click();
  await expect(page.locator('#status')).toHaveText('RUNNING');

  // Safe-left must decrease after revealing.
  await expect(left).not.toHaveText('85');

  // Timer ticks down.
  await page.waitForTimeout(1100);
  const t = await page.locator('#time').innerText();
  expect(Number(t)).toBeLessThanOrEqual(179);

  // Flag mode toggles, then a tap places a flag.
  await page.locator('#flag').click();
  await expect(page.locator('#flag')).toHaveText(/Flag: ON/);
  const toFlag = page.locator('#grid .c:not(.rev)').first();
  await toFlag.click();
  await expect(toFlag).toHaveClass(/flag/);

  // Restart resets the game.
  await page.locator('#restart').click();
  await expect(page.locator('#status')).toHaveText('READY');
  await expect(page.locator('#time')).toHaveText('180');

  if (process.env.CAPTURE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 430, height: 860 });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: '../../docs/assets/applovin-gameplay.jpg',
      type: 'jpeg',
      quality: 80,
      fullPage: false,
    });
  }
});

import { test, expect } from '@playwright/test';

test('xrpl page can simulate a deterministic receipt (evidence)', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'mosaicledger.flags.v1',
      JSON.stringify({ demoMode: true, judgeMode: true, xrplEnabled: true }),
    );
  });

  await page.goto('/app/xrpl');

  await expect(page.getByRole('heading', { name: /XRPL/i })).toBeVisible();
  await page.getByRole('button', { name: 'Simulate Receipt' }).click();

  await expect(page.getByText('Receipt')).toBeVisible();
  await expect(page.getByText(/SIM_[0-9A-F]+/)).toBeVisible();

  // Optional evidence capture: generate a screenshot file under docs/assets for submissions.
  if (process.env.CAPTURE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1100, height: 750 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '../../docs/assets/ripple-xrpl-roundups.png', fullPage: true });
  }
});

import { expect, test } from '@playwright/test';

test('dashboard hides sponsor labels and round-up sweep simulation works', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'mosaicledger.flags.v1',
      JSON.stringify({ demoMode: true, judgeMode: true, nessieEnabled: true, xrplEnabled: true }),
    );
  });

  await page.goto('/app');

  // No sponsor-branded labels in nav or dashboard.
  await expect(page.locator('nav')).not.toContainText('Capital One');
  await expect(page.locator('nav')).not.toContainText('XRPL');
  await expect(page.locator('body')).not.toContainText('Capital One');
  await expect(page.locator('body')).not.toContainText('XRPL');

  await expect(page.getByText('Round-up Sweep')).toBeVisible();
  await page.getByRole('button', { name: 'Simulate sweep' }).click();

  await expect(page.getByText('Last receipt')).toBeVisible();
});

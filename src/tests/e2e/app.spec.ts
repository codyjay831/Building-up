import { expect, test } from '@playwright/test';

import { selectBuildCatalogItem } from '@/tests/e2e/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

test('loads the interactive property board', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /lot 12 — riverside starter/i })).toBeVisible();
  await expect(page.getByTestId('scenario-objective-strip')).toBeVisible();
  await expect(page.getByLabel('Property board')).toBeVisible();
  await expect(page.getByText('South Road')).toBeVisible();

  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Build catalog' })).toBeVisible();
});

test('inspects starter house and previews invalid placement', async ({ page }) => {
  await page.getByTestId('tile-3-6').click();
  await expect(page.getByRole('heading', { name: 'Existing House' })).toBeVisible();

  await selectBuildCatalogItem(page, 'Build Small House');
  await page.getByTestId('tile-3-6').click();

  await expect(page.getByTestId('placement-invalid-reason')).toContainText(/overlap/i);

  await page.getByRole('button', { name: 'Cancel placement' }).click();
  await page.getByRole('button', { name: 'Property', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Property summary' })).toBeVisible();
});

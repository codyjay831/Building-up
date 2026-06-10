import { expect, test } from '@playwright/test';

import { selectBuildCatalogItem } from '@/tests/e2e/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

test('commits a project and advances construction', async ({ page }) => {
  await selectBuildCatalogItem(page, 'Build Small Park');
  await page.getByTestId('tile-0-0').click();

  await expect(page.getByRole('heading', { name: 'Project forecast' })).toBeVisible();
  await expect(page.getByTestId('commit-project-button')).toBeEnabled();
  await expect(page.getByText('(1, 1)')).toBeVisible();

  await page.getByTestId('commit-project-button').hover();
  await expect(page.getByText('(1, 1)')).toBeVisible();
  await expect(page.getByTestId('commit-project-button')).toBeEnabled();

  await page.getByTestId('commit-project-button').click();

  await page.getByTestId('tile-0-0').click();
  await expect(page.getByRole('heading', { name: 'Small Park' })).toBeVisible();
  await expect(page.getByTestId('construction-progress')).toBeVisible();

  await page.getByTestId('advance-month-button').click();
  await page.getByTestId('monthly-report-drawer').getByRole('button', { name: 'Close' }).click();

  await page.getByTestId('tile-0-0').click();
  await expect(page.getByText('Leasing', { exact: true })).toBeVisible();
});

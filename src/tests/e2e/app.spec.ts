import { expect, test } from '@playwright/test';

test('loads the interactive property board', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /lot 12 — riverside starter/i })).toBeVisible();
  await expect(page.getByLabel('Property board')).toBeVisible();
  await expect(page.getByText('South Road')).toBeVisible();
  await expect(page.getByLabel('Build catalog')).toBeVisible();
});

test('inspects starter house and previews invalid placement', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('tile-3-6').click();
  await expect(page.getByRole('heading', { name: 'Existing House' })).toBeVisible();

  await page.getByRole('button', { name: 'Build Small House' }).click();
  await page.getByTestId('tile-3-6').click();

  await expect(page.getByTestId('placement-invalid-reason')).toContainText(/overlap/i);

  await page.getByRole('button', { name: 'Cancel placement' }).click();
  await expect(page.getByRole('heading', { name: 'Property summary' })).toBeVisible();
});

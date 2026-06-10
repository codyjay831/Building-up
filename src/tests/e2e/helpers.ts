import type { Page } from '@playwright/test';

export async function openBuildDrawer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Build', exact: true }).click();
}

export async function closeBuildDrawer(page: Page): Promise<void> {
  const drawer = page.getByLabel('Build catalog');
  const closeButton = drawer.getByRole('button', { name: 'Close' });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}

export async function selectBuildCatalogItem(page: Page, itemName: string): Promise<void> {
  await openBuildDrawer(page);
  await page.getByRole('button', { name: itemName }).click();
}

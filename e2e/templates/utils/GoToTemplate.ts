import type { Page } from '@playwright/test';

export const GoToMockTemplatesGallery = async (page: Page) => {
  await page.getByText('Local', { exact: true }).click();
  await page.getByLabel('Categories').click();
  await page.getByText('Mock').click();
};

export const GoToMockTemplate = async (page: Page, templateName: string) => {
  await page.getByText('Local', { exact: true }).click();
  await page.getByLabel('Categories').click();
  await page.getByText('Mock').click();

  await page.waitForTimeout(10);

  await page.getByText(templateName, { exact: true }).click();
};

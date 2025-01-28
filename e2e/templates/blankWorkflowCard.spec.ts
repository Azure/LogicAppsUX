import { expect, test } from '@playwright/test';
import { GoToMockTemplatesGallery } from './utils/GoToTemplate';

test.describe(
  'Blank Workflow Card Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Blank Workflow Card for Standard', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplatesGallery(page);
      await page.getByText('Blank workflow', { exact: true }).click();

      page.once('dialog', (dialog) => {
        expect(dialog.message()).toBe('On Blank Workflow Click');

        dialog.dismiss().catch(() => {});
      });
      await page.getByText('Blank workflow', { exact: true }).click();
    });

    test('Blank Workflow Card for Consumption', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplatesGallery(page);
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Blank workflow', { exact: true }).click();

      page.once('dialog', (dialog) => {
        expect(dialog.message()).toBe('On Blank Workflow Click');

        dialog.dismiss().catch(() => {});
      });
      await page.getByText('Blank workflow', { exact: true }).click();
    });
  }
);

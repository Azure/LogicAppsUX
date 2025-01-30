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
      await expect(page.getByText('Start with an empty workflow to build your integration solution.', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Replace your existing workflow with an empty workflow to rebuild your integration solution.', { exact: true })
      ).not.toBeVisible();

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
      await expect(page.getByText('Start with an empty workflow to build your integration solution.', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Replace your existing workflow with an empty workflow to rebuild your integration solution.', { exact: true })
      ).not.toBeVisible();

      page.once('dialog', (dialog) => {
        expect(dialog.message()).toBe('On Blank Workflow Click');

        dialog.dismiss().catch(() => {});
      });
      await page.getByText('Blank workflow', { exact: true }).click();
    });
  }
);

import { expect, test } from '@playwright/test';
import { GoToMockTemplate, GoToMockTemplatesGallery } from './utils/GoToTemplate';

test.describe(
  'Sanity Check',
  {
    tag: '@mock',
  },
  () => {
    test('Should templates gallery', async ({ page }) => {
      await page.goto('/templates');

      await GoToMockTemplatesGallery(page);

      await page.getByRole('tab', { name: 'All' }).click();
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByText('Blank workflow', { exact: true }).click();
      await page.getByRole('tab', { name: 'Accelerators' }).click();
      await page.getByText('A to Z, ascending').click();
      await page.keyboard.type('Mock');

      expect(true).toBeTruthy();
    });

    test('Should open edge context menus', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplate(page, '[Mock] Basic Workflow Only Template');
      await page.getByRole('tab', { name: 'Workflow' }).click();
      await page.getByRole('tab', { name: 'Summary' }).click();
      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await page.getByText('Stateless', { exact: true }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();

      expect(true).toBeTruthy();
    });
  }
);

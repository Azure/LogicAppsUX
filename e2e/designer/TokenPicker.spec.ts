import test, { expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Token Picker Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Token picker search should have robust name matching', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      await page.getByLabel('Parse JSON operation, Data').click();
      await page.getByLabel('Content').click();
      await page.locator('button').filter({ hasText: '' }).click();
      await expect(page.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
      await page.getByPlaceholder('Search').click();
      await page.getByPlaceholder('Search').fill('OCSA');
      await expect(page.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
      await page.getByPlaceholder('Search').click();
      await page.getByPlaceholder('Search').fill('_L2');
      await expect(page.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
      await page.getByPlaceholder('Search').click();
      await page.getByPlaceholder('Search').fill('OCSR');
      await expect(page.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
    });
  }
);

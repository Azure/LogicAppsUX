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
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();
      // Scope to the token picker so we match the dynamic-content list option and not the
      // (now clickable) token chip already present in the editor, which shares the same name.
      const tokenPicker = page.locator('.msla-token-picker-container-v3');
      await expect(tokenPicker.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
      await page.getByPlaceholder('Search').click();
      await page.getByPlaceholder('Search').fill('OCSA');
      await expect(tokenPicker.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
      await page.getByPlaceholder('Search').click();
      await page.getByPlaceholder('Search').fill('_L2');
      await expect(tokenPicker.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
      await page.getByPlaceholder('Search').click();
      await page.getByPlaceholder('Search').fill('OCSR');
      await expect(tokenPicker.getByRole('button', { name: 'EILCO Admin Nominations-OCSA' })).toBeVisible();
    });

    test('Expression Editor works with dynamic content', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      await page.getByLabel('Parse JSON operation, Data').click();
      await page.getByLabel('Content').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-expression"]').click();
      await page.getByRole('button', { name: 'length(collection) Returns' }).click();
      await page.getByText('Dynamic content').click();
      await expect(page.locator('.msla-expression-editor-container')).toBeVisible();
      await page.getByRole('button', { name: 'ArrayVariable', exact: true }).click();
      await expect(page.locator('.msla-expression-editor-container')).toContainText("length(variables('ArrayVariable'))");
    });
  }
);

import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'QueryCache Tests',
  {
    tag: '@mock',
  },
  () => {
    test('QueryCache should be persisted locally using local storage', async ({ page }) => {
      await page.goto('/');

      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('control-expand-collapse-button', 'true');
      });

      await GoToMockWorkflow(page, 'Panel');
      expect(await page.getByText('manual', { exact: true }).isVisible()).toBeTruthy();

      // There should be no cache in local storage
      expect((await page.evaluate(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') ?? '')) == '').toBeTruthy();

      // Refresh page
      await page.reload();
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('control-expand-collapse-button', 'true');
      });

      // Enable query caching
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();
      await page.locator('label').filter({ hasText: 'Query Cache Persist' }).locator('i').click();

      await GoToMockWorkflow(page, 'Panel');
      expect(await page.getByText('manual', { exact: true }).isVisible()).toBeTruthy();

      await page.waitForFunction(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') !== null);

      // Confirm that the query cache is stored in local storage
      expect((await page.evaluate(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') ?? '')) != '').toBeTruthy();
    });
  }
);

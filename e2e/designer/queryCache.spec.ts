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

      await page.evaluate(() => localStorage.clear());

      await GoToMockWorkflow(page, 'Panel');
      expect(await page.getByText('manual', { exact: true }).isVisible()).toBeTruthy();

      // There should be no cache in local storage
      expect((await page.evaluate(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') ?? '')) == '').toBeTruthy();

      // Refresh page
      await page.reload();
      await page.evaluate(() => localStorage.clear());

      // Enable query caching
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();
      await page.locator('label').filter({ hasText: 'Query Cache Persist' }).locator('i').click();

      await GoToMockWorkflow(page, 'Panel');
      expect(await page.getByText('manual', { exact: true }).isVisible()).toBeTruthy();

      // Confirm that the query cache is stored in local storage
      expect((await page.evaluate(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') ?? '')) != '').toBeTruthy();
    });
  }
);

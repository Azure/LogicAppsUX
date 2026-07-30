import { test, expect } from '@playwright/test';
import { GoToMockWorkflowUrl } from './utils/GoToWorkflow';

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

      await GoToMockWorkflowUrl(page, 'Panel');
      expect(await page.getByText('manual', { exact: true }).isVisible()).toBeTruthy();

      // There should be no cache in local storage
      expect((await page.evaluate(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') ?? '')) == '').toBeTruthy();

      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('control-expand-collapse-button', 'true');
      });

      // Reload with query caching enabled
      await GoToMockWorkflowUrl(page, 'Panel', { queryCachePersist: true });
      expect(await page.getByText('manual', { exact: true }).isVisible()).toBeTruthy();

      await page.waitForFunction(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') !== null);

      // Confirm that the query cache is stored in local storage
      expect((await page.evaluate(() => localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') ?? '')) != '').toBeTruthy();
    });
  }
);

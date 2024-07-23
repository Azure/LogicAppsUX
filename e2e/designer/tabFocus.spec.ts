import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'TabFocus Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should tab through the workflow properly', async ({ page }) => {
      const tab = async () => page.locator('*:focus').press('Tab');

      await page.goto('/');
      await page.getByText('Local', { exact: true }).click();
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Find element with text 'Recurrence'
      await page.getByText('Recurrence', { exact: true }).click();
      // Focus should be on the collapse button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Collapse');
      // Close node panel
      await page.locator('body').press('Enter');
      // Focus should be on the first node again
      expect(await page.locator('*:focus').innerText()).toBe('Recurrence');
      await tab();
      await tab();
      // Focus should be on the switch node
      expect(await page.locator('*:focus').innerText()).toBe('Switch');
      await tab();
      // Focus should be on the switch collapse button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Collapse');
      await tab();
      // Focus should be on the first switch case
      expect(await page.locator('*:focus').innerText()).toBe('Conditional Case');
      await tab();
      await tab();
      // Focus should be on the edge between the switch case and the condition node
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Insert a new step between Conditional Case and Condition');
      await tab();
      await tab();
      await tab();
      // Focus should be on the 'true' subgraph card
      expect(await page.locator('*:focus').innerText()).toContain('True');
      await tab();
      await tab();
      // Should be the first terminate node
      expect(await page.locator('*:focus').innerText()).toBe('Terminate');
    });
  }
);

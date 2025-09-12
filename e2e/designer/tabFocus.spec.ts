import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'TabFocus Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should tab through the workflow properly', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');
      const tab = async () => page.locator('*:focus').press('Tab');

      await page.goto('/');
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

    test('Should open node details panel with proper focus', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');
      const tab = async () => page.locator('*:focus').press('Tab');
      const backTab = async () => page.locator('*:focus').press('Shift+Tab');

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Find element with text 'manual'
      await page.getByText('manual', { exact: true }).click();
      // Focus should be on the collapse button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Collapse');
      await tab();
      // Focus should be on the node name textfield
      expect(await page.locator('*:focus').getAttribute('value')).toBe('manual');
      // Delete one character
      await page.locator('*:focus').press('ArrowRight');
      await page.locator('*:focus').press('Backspace');
      // Focus should be on the node name textfield
      expect(await page.locator('*:focus').getAttribute('value')).toBe('manua');
      await backTab();
      // Focus should be on the collapse button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Collapse');
      // Close node panel
      await page.locator('body').press('Enter');
    });
  }
);

import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'NodeSearchPanel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Selecting action from node panel should open action panel', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Conditionals (Complex)');

      // Ensure conditional and action inside is visible
      expect(await page.getByText('Verify property changes', { exact: true }).isVisible()).toBeTruthy();
      expect(await page.getByText('Terminate', { exact: true }).isVisible()).toBeTruthy();

      // Open node search panel and select action
      await page.getByRole('button', { name: 'Search workflow actions', exact: true }).click();
      const search = page.getByRole('dialog', { name: 'Go to operation', exact: true });
      await search.getByPlaceholder('Search for operation', { exact: true }).fill('Verify property changes');
      await search.getByText('Verify property changes', { exact: true }).click();
      await expect(search).toBeHidden();

      // node panel tab is open with terminate action
      expect(await page.getByText('Terminate', { exact: true }).isVisible()).toBeTruthy();
      await page.getByRole('tab', { name: 'Code View' }).click();
      await page.getByRole('tab', { name: 'About' }).click();
      await page.getByRole('tab', { name: 'Settings' }).click();
      await page.getByRole('tab', { name: 'Parameters' }).click();
      await page.getByRole('tab', { name: 'Settings' }).click();
    });
  }
);

import { test, expect } from '@playwright/test';
import { LoadMockDirect } from './utils/GoToWorkflow';

test.describe(
  'NodeSearchPanel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Selecting action from node panel should open action panel', async ({ page }) => {
      await LoadMockDirect(page, 'MoreComplex.json');

      // Ensure conditional and action inside is visible
      expect(await page.getByText('Verify property changes', { exact: true }).isVisible()).toBeTruthy();
      expect(await page.getByText('Terminate', { exact: true }).isVisible()).toBeTruthy();

      // Open node search panel and select action
      await page.getByLabel('Search workflow actions').click();
      await page.getByTestId('msla-op-search-result-verify_property_changes').click();

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

import { expect, test } from '../../../fixtures/real-api';
test.describe(
  'Nested loops',
  {
    tag: '@real',
  },
  () => {
    test('Sanity check', async ({ page, browserName, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow('NestedLoops');

      console.log(`browserName: ${browserName}`);

      // Check workfow loads correctly
      await expect(page.getByLabel('Foreach operation')).toBeVisible();
      await expect(page.getByLabel('Foreach-2 operation')).toBeVisible();

      // Load run history
      await page.getByRole('menuitem', { name: 'Run History' }).click();
      await page.waitForTimeout(5000);
      await page.getByRole('gridcell', { name: '/18/2025, 3:25:03 PM' }).click();
      await page.waitForTimeout(5000);

      // Check for outermost foreach
      await expect(page.getByTestId('msla-pill-foreach_status')).toBeVisible();
      await expect(page.getByTestId('msla-pager-v2-foreach')).toBeVisible();

      // Check for innermost foreach
      await expect(page.getByTestId('msla-pill-foreach_2_status')).toBeVisible();
      await expect(page.getByTestId('msla-pager-v2-foreach_2')).toBeVisible();
    });
  }
);

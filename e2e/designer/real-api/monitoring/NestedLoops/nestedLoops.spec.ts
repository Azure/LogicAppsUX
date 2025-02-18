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
      await page.waitForTimeout(3000);
      await page.getByRole('gridcell', { name: '/18/2025, 3:25:03 PM' }).click();

      // Check for outermost foreach
      await expect(page.getByTestId('msla-pill-foreach_status')).toBeVisible();
      await expect(page.getByTestId('msla-pager-v2-foreach')).toBeVisible();

      // Check for inner actions
      await expect(page.getByTestId('card-Increment counter')).toBeVisible();
      await expect(page.getByLabel('1.1 seconds. Succeeded')).toContainText('1s');
      await expect(page.getByLabel('11.3 seconds. Succeeded')).toContainText('11s');

      // Check for innermost loop
      await expect(page.getByTestId('msla-pill-foreach_2_status')).toBeVisible();
      await expect(page.getByTestId('msla-pager-v2-foreach_2')).toBeVisible();

      // Open panel
      await page.getByTestId('card-increment_counter').getByRole('button', { name: 'Increment counter' }).click();
      await expect(page.getByLabel('Value', { exact: true }).locator('pre')).toContainText('1');

      // Move to next iteration
      await page.getByTestId('rf__node-Foreach-#scope').getByLabel('Next').click();
      await expect(page.getByLabel('Value', { exact: true }).locator('pre')).toContainText('2');
      await expect(page.getByLabel('0.1 seconds. Succeeded')).toContainText('0.1s');
      await expect(page.getByLabel('13.3 seconds. Succeeded')).toContainText('13s');
    });
  }
);

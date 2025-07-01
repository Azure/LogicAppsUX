import test, { expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Recurrence Tests',
  {
    tag: '@mock',
  },
  async () => {
    test.skip('Recurrence should load preview text properly', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Recurrence');
      await page.getByTestId('card-recurrence').click();

      // interval
      await page.getByPlaceholder('Specify the interval.').click();
      await page.getByPlaceholder('Specify the interval.').fill('12');

      // Frequency
      await page.getByText('Week', { exact: true }).click();
      await page.getByRole('option', { name: 'Week' }).click();

      // Time Zone
      await page.getByText('(UTC-12:00) International').click();
      await page.getByRole('option', { name: '(UTC-08:00) Baja California' }).click();

      // Expected Preview Text
      await expect(page.locator('#msla-node-details-panel-Recurrence')).toContainText(
        'Runs at 0:12, 0:13, 5:12, 5:13, 8:12, 8:13 Every 12 weeks'
      );

      // Removing Minutes
      await page.getByPlaceholder('Enter the valid minute values').click();
      await page.getByPlaceholder('Enter the valid minute values').fill('');
      await page.locator('#msla-node-details-panel-Recurrence div').filter({ hasText: 'Recurrence*Interval*Frequency' }).first().click();

      // Expected Preview Text without Minutes or Start Time
      await expect(page.locator('#msla-node-details-panel-Recurrence')).toContainText(
        "Runs at 0:xx, 5:xx, 8:xx Every 12 weeksIf a recurrence doesn't specify a specific start date and time, the first recurrence runs immediately when you save or deploy the logic app"
      );

      // Adding a Start Time
      await page.getByPlaceholder('Example: 2017-03-24T15:00:00Z').click();
      await page.getByPlaceholder('Example: 2017-03-24T15:00:00Z').fill('2025-01-22T18:38:03Z');
      await page.locator('#msla-node-details-panel-Recurrence div').filter({ hasText: 'Recurrence*Interval*Frequency' }).first().click();

      // Expected Preview Text with Start Time
      await expect(page.locator('#msla-node-details-panel-Recurrence')).toContainText('Runs at 0:38, 5:38, 8:38 Every 12 weeks');
    });
  }
);

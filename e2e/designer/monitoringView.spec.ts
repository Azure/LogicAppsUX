import { test, expect } from '@playwright/test';
import { GoToMockWorkflow, LoadRunFile } from './utils/GoToWorkflow';

test.describe(
  'Monitoring view tests sanity check',
  {
    tag: '@mock',
  },
  () => {
    test('Sanity check', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Monitoring view conditional');
      await LoadRunFile(page, 'normalState');

      // // Open workflow parameters panel

      await expect(page.getByTestId('msla-pill-Condition 2-status')).toBeVisible();

      // await page.getByText('Workflow Parameters', { exact: true }).click();
      // await expect(page.locator('.msla-workflow-parameters-heading')).toBeVisible();

      // // Verify existing float parameter was loaded properly
      // await page.getByRole('button', { name: 'Float Parameter' }).click();
      // await expect(page.getByText('Name*Float Parameter')).toBeVisible();
      // await expect(page.getByText('Type*Float')).toBeVisible();
      // await expect(page.getByText('Value*9.9')).toBeVisible();
      // await page.getByRole('button', { name: 'Float Parameter' }).click();

      // // Create new parameter
      // await page.getByRole('button', { name: 'Create parameter' }).click();
      // await expect(page.getByRole('button', { name: 'New parameter' })).toBeVisible();
      // const paramId = await page.getByRole('button', { name: 'New parameter' }).getAttribute('id');
      // // Give param a name
      // await page.getByTestId(`${paramId}-name`).click();
      // await page.keyboard.type('PlaywrightParam');
      // // Verify name changed
      // await expect(page.getByRole('button', { name: 'PlaywrightParam' })).toBeVisible();
      // // Change param type
      // await page.getByTestId(`${paramId}-type`).getByText('Array').click();
      // await page.getByRole('option', { name: 'String' }).click();
      // // Change param value
      // await page.getByTestId(`${paramId}-value`).click();
      // await page.getByTestId(`${paramId}-value`).fill('Hello');
      // // Delete param
      // await page.getByTestId(`${paramId}-parameter-delete-button`).click();
      // await expect(page.getByRole('button', { name: 'PlaywrightParam' })).not.toBeVisible();

      // // Close workflow parameters panel
      // await page.getByLabel('Close panel').click();
      // await expect(page.locator('.msla-workflow-parameters-heading')).not.toBeVisible();
    });

    test('Sanity check for loading state', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Monitoring view conditional');
      await LoadRunFile(page, 'loadingState');

      // Verify trigger status
      await expect(page.getByTestId('msla-pill-when_a_http_request_is_received_status')).toBeVisible();
      await expect(page.getByTestId('msla-pill-when_a_http_request_is_received_status')).toHaveAttribute(
        'aria-label',
        '0 seconds. Succeeded'
      );

      // Verify loading status for action
      await expect(page.getByTestId('msla-pill-delay_status')).toBeVisible();
      await expect(page.getByTestId('msla-pill-delay_status')).toHaveAttribute('aria-label', 'Running');
      await expect(page.getByTestId('msla-pill-delay_status')).toHaveClass(/status-only/);
    });
  }
);

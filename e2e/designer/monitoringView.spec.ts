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

      await expect(page.getByTestId('msla-pill-Condition 2-status')).toBeVisible();
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

      // Verify actions below the loading actions are inactive
      await expect(page.getByTestId('card-increment_variable')).toHaveClass(/msla-card-inactive/);
      await expect(page.getByTestId('card-filter_array')).toHaveClass(/msla-card-inactive/);
      await expect(page.getByTestId('card-increment_variable')).toHaveClass(/msla-card-inactive/);
      await expect(page.getByTestId('msla-graph-container-condition_2')).toHaveClass(/msla-card-inactive/);
      await expect(page.getByTestId('msla-graph-container-condition')).toHaveClass(/msla-card-inactive/);
    });
  }
);

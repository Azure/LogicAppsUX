import { test, expect } from '@playwright/test';
import { GoToMockWorkflow, LoadRunFile } from '../utils/GoToWorkflow';

test.describe(
  'Loops pager in monitoring view tests',
  {
    tag: '@mock',
  },
  () => {
    test('Success run check', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Loops pager');
      await LoadRunFile(page, 'SuccessRun');

      // Verify status for success in previous action
      await expect(page.getByTestId('msla-pill-initialize_variable_status')).toBeVisible();
      await expect(page.getByTestId('msla-pill-initialize_variable_status')).toHaveAttribute('aria-label', '0.9 seconds. Succeeded');

      // Verify status for success in until action
      await expect(page.getByTestId('msla-pill-until_status')).toBeVisible();
      await expect(page.getByTestId('msla-pill-until_status')).toHaveAttribute('aria-label', '9.6 seconds. Succeeded');

      // Verify pager loads
      await expect(page.getByTestId('msla-pager-v2-until')).toBeVisible();
    });
  }
);

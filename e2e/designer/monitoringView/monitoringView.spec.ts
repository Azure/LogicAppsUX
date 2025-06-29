import { test, expect } from '../fixtures/opacityFixture';
import { GoToMockWorkflow, LoadRunFile } from '../utils/GoToWorkflow';

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

      // Verify status for success action
      await expect(page.getByTestId('msla-pill-condition_2_status')).toBeVisible();
      await expect(page.getByTestId('msla-pill-condition_2_status')).toHaveAttribute('aria-label', '0.1 seconds. Succeeded');

      // Verify status for skipped action
      await expect(page.getByTestId('msla-pill-compose_2_status')).toBeVisible();
      await expect(page.getByTestId('msla-pill-compose_2_status')).toHaveAttribute('aria-label', '0 seconds. Skipped');
      await expect(page.getByTestId('card-compose_2').getByRole('button')).toContainText(" 'Compose_2' skipped");

      // Verify actions below the loading actions are not inactive
      await expect(page.getByTestId('card-increment_variable')).not.toHaveOpacity(0.3);
      await expect(page.getByTestId('card-filter_array')).not.toHaveOpacity(0.3);
      await expect(page.getByTestId('card-increment_variable')).not.toHaveOpacity(0.3);
      await expect(page.getByTestId('card-condition_2')).not.toHaveOpacity(0.3);
      await expect(page.getByTestId('card-condition')).not.toHaveOpacity(0.3);
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

      // Verify actions below the loading actions are inactive

      await expect(page.getByTestId('card-increment_variable')).toHaveOpacity(0.3);
      await expect(page.getByTestId('card-filter_array')).toHaveOpacity(0.3);
      await expect(page.getByTestId('card-condition_2')).toHaveOpacity(0.3);
      await expect(page.getByTestId('card-condition')).toHaveOpacity(0.3);
    });
  }
);

import { test, expect } from '@playwright/test';
import { GoToMockWorkflowV2 } from './utils/GoToWorkflow';

test.describe(
  'Designer notes tests',
  {
    tag: '@mock',
  },
  async () => {
    // Regression test for https://github.com/Azure/LogicAppsUX/issues/9466
    test('Malformed entries in definition.metadata.notes do not crash the designer', async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await GoToMockWorkflowV2(page, 'Notes In Metadata');

      await expect(page.getByTestId('card-check_for_entra_security_alerts')).toBeVisible();
      await expect(page.getByTestId('card-initialize_variable')).toBeVisible();

      // The well-formed note still renders, the arbitrary user content is dropped.
      await expect(page.locator('[data-testid="rf__node-validNote"]')).toBeVisible();
      await expect(page.locator('[data-testid="rf__node-purpose"]')).toHaveCount(0);

      expect(pageErrors).toEqual([]);
    });
  }
);

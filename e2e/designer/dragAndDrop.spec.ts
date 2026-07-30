import { test } from '@playwright/test';
import { GoToMockWorkflowUrl } from './utils/GoToWorkflow';

test(
  'Should be able to drag and drop operations',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await GoToMockWorkflowUrl(page, 'Panel');
    await page.getByTestId('card-http').dragTo(page.getByTestId('msla-plus-button-manual-initialize_arrayvariable'));
  }
);

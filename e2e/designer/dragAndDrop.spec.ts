import { test } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test(
  'Should be able to drag and drop operations',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');

    await GoToMockWorkflow(page, 'Panel');
    await page.getByTestId('card-http').dragTo(page.getByTestId('msla-plus-button-manual-initialize_arrayvariable'));
  }
);

import { test } from '@playwright/test';
import { LoadMockDirect } from './utils/GoToWorkflow';

test(
  'Should be able to drag and drop operations',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await LoadMockDirect(page, 'Panel.json');
    await page.getByTestId('card-http').dragTo(page.getByTestId('msla-plus-button-manual-initialize_arrayvariable'));
  }
);

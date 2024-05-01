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
    await page
      .getByLabel('HTTP operation, HTTP connector')
      .dragTo(page.getByTestId('rf__edge-manual-Initialize_ArrayVariable').getByLabel('Insert a new step between'));
  }
);

import { test, expect } from '@playwright/test';
import { LoadMockDirect } from '../utils/GoToWorkflow';

test(
  'condition editor',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await LoadMockDirect(page, 'Conditionals.json');
    await expect(page.getByLabel('Condition operation')).toBeVisible();

    await page.getByLabel('Condition operation').click();

    await page.getByLabel('Open', { exact: true }).first().click();
    await page.getByRole('option', { name: 'AND' }).click();

    await expect(page.getByRole('alert')).toContainText('Enter a valid condition statement.');
  }
);

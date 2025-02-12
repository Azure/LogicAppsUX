import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';

test(
  'condition editor',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');

    await GoToMockWorkflow(page, 'Conditionals');
    await expect(page.getByLabel('Condition operation')).toBeVisible();

    await page.getByLabel('Condition operation').click();

    await page.getByText('OR', { exact: true }).click();
    await page.getByRole('option', { name: 'AND' }).click();

    await expect(page.getByRole('alert')).toContainText('Enter a valid condition statement.');
  }
);

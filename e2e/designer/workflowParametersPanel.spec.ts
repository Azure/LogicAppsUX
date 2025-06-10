import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'WorkflowParametersPanel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should open workflow parameters panel and add / edit / delete parameter', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Standard Workflow Parameters');

      // Open workflow parameters panel
      await page.getByText('Workflow Parameters', { exact: true }).click();

      // Verify existing float parameter was loaded properly
      await page.getByRole('button', { name: 'Float Parameter' }).click();
      await expect(page.getByPlaceholder('Enter parameter name.')).toHaveValue('Float Parameter');
      await expect(page.getByText('Type*Float')).toBeVisible();
      await expect(page.getByPlaceholder('Enter value for parameter.')).toHaveValue('9.9');
      await page.getByRole('button', { name: 'Float Parameter' }).click();

      // Create new parameter
      await page.getByRole('button', { name: 'Create parameter' }).click();
      await expect(page.getByRole('button', { name: 'New parameter' })).toBeVisible();
      const paramId = (await page.getByPlaceholder('Enter parameter name.').getAttribute('id'))?.replace('-name', '');

      // Give param a name
      await page.getByPlaceholder('Enter parameter name.').click();
      await page.keyboard.type('PlaywrightParam');
      // Verify name changed
      await expect(page.getByRole('button', { name: 'PlaywrightParam' })).toBeVisible();
      // Change param type
      await page.getByTestId(`${paramId}-type`).click();
      await page.getByRole('option', { name: 'String' }).click();
      // Change param value
      await page.getByTestId(`${paramId}-value`).click();
      await page.getByTestId(`${paramId}-value`).fill('Hello');
      // Delete param
      await page
        .locator('div')
        .filter({ hasText: /^PlaywrightParamString$/ })
        .getByLabel('Delete parameter')
        .click();
      await expect(page.getByRole('button', { name: 'PlaywrightParam' })).not.toBeVisible();

      // Close workflow parameters panel
      await page.getByLabel('Close panel').click();
      await expect(page.locator('.msla-workflow-parameters-heading')).not.toBeVisible();
    });
  }
);

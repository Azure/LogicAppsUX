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
      await expect(page.locator('.msla-workflow-parameters-heading')).toBeVisible();

      // Verify existing float parameter was loaded properly
      await page.getByRole('button', { name: 'Float Parameter' }).click();
      await expect(page.getByText('Name*Float Parameter')).toBeVisible();
      await expect(page.getByText('Type*Float')).toBeVisible();
      await expect(page.getByText('Value*9.9')).toBeVisible();
      await page.getByRole('button', { name: 'Float Parameter' }).click();

      // Create new parameter
      await page.getByRole('button', { name: 'Create parameter' }).click();
      await expect(page.getByRole('button', { name: 'New parameter' })).toBeVisible();
      const paramId = await page.getByRole('button', { name: 'New parameter' }).getAttribute('id');
      // Give param a name
      await page.getByTestId(`${paramId}-name`).click();
      await page.keyboard.type('PlaywrightParam');
      // Verify name changed
      await expect(page.getByRole('button', { name: 'PlaywrightParam' })).toBeVisible();
      // Change param type
      await page.getByTestId(`${paramId}-type`).getByText('Array').click();
      await page.getByRole('option', { name: 'String' }).click();
      // Change param value
      await page.getByTestId(`${paramId}-value`).click();
      await page.getByTestId(`${paramId}-value`).fill('Hello');
      // Delete param
      await page.getByTestId(`${paramId}-parameter-delete-button`).click();
      await expect(page.getByRole('button', { name: 'PlaywrightParam' })).not.toBeVisible();

      // Close workflow parameters panel
      await page.getByLabel('Close panel').click();
      await expect(page.locator('.msla-workflow-parameters-heading')).not.toBeVisible();
    });
  }
);

import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'ErrorsPanel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should show operation errors in errors panel', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      await page.getByRole('button', { name: 'zoom out' }).click();

      // Delete required parameter value
      await page.getByRole('button', { name: 'HTTP', exact: true }).click();
      await page.getByLabel('URI*').fill('');
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      // Open errors panel
      await page.getByRole('button', { name: 'Errors' }).click();
      await expect(page.getByText("'URI' is required.")).toBeVisible();
      await page.getByText('Open operation').click();
      await expect(page.getByText("'URI' is required.")).toBeVisible();

      // Change uri param to an invalid value
      await page.getByLabel('URI*').fill('test');
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      // Open errors panel
      await page.getByRole('button', { name: 'Errors' }).click();
      await expect(page.getByText('Enter a valid URI.')).toBeVisible();
      await page.getByText('Open operation').click();
      await expect(page.getByText('Enter a valid URI.')).toBeVisible();
      await page.getByTestId('msla-panel-header-collapse-nav').click();
    });

    test('Should show workflow parameters errors in errors panel', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Open workflow parameters panel
      await page.getByText('Workflow Parameters', { exact: true }).click();
      await expect(page.locator('.msla-workflow-parameters-heading')).toBeVisible();
      // Create new parameter
      await page.getByRole('button', { name: 'Create parameter' }).click();
      await expect(page.getByRole('button', { name: 'New parameter' })).toBeVisible();
      const paramId = await page.getByRole('button', { name: 'New parameter' }).getAttribute('id');
      // Give param a name
      await page.getByTestId(`${paramId}-name`).click();
      await page.keyboard.type('PlaywrightParam');
      // Verify name changed
      await expect(page.getByRole('button', { name: 'PlaywrightParam' })).toBeVisible();
      await page.getByLabel('Close panel').click();

      // Open errors panel
      await page.getByRole('button', { name: 'Errors' }).click();
      await expect(page.getByText('Workflow parameter errors')).toBeVisible();
      await expect(page.getByText('PlaywrightParam')).toBeVisible();
      await expect(page.getByText('Must provide value for parameter.')).toBeVisible();
      // Click error to open workflow parameters panel
      await page.getByRole('button', { name: 'Open panel' }).click();
      await expect(page.getByTestId('PlaywrightParam-parameter-heading-button')).toBeVisible();
      await expect(page.getByText('Must provide value for parameter.')).toBeVisible();
    });
  }
);

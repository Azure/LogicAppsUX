import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Collapse actions tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should collapse actions', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Collapse action
      await page.getByText('HTTP', { exact: true }).click({ button: 'right' });
      expect(await page.getByText('Collapse action', { exact: true })).toBeVisible();
      await page.getByText('Collapse action').click({ force: true });
      await expect(page.getByTestId('msla-collapsed-card-http')).toBeVisible();
      await expect(page.getByLabel('HTTP operation icon')).toBeVisible();
      await expect(page.getByTestId('collapsed-text-HTTP')).not.toBeVisible();
    });

    test('Should collapse actions and expand', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Collapse last action
      await page.getByText('Filter array', { exact: true }).click({ button: 'right' });
      expect(await page.getByText('Filter array', { exact: true })).toBeVisible();
      await page.getByText('Collapse action').click({ force: true });
      await expect(page.getByTestId('msla-collapsed-card-filter_array')).toBeVisible();
      await expect(page.getByLabel('HTTP operation icon')).toBeVisible();
      await expect(page.getByTestId('collapsed-text-http')).not.toBeVisible();

      // Collapse first action
      await page.getByText('Initialize ArrayVariable', { exact: true }).click({ button: 'right' });
      expect(await page.getByText('Collapse action', { exact: true })).toBeVisible();
      await page.getByText('Collapse action').click({ force: true });
      await expect(page.getByTestId('msla-collapsed-card-initialize_arrayvariable')).toBeVisible();
      await expect(page.getByLabel('Initialize_ArrayVariable operation icon')).toBeVisible();
      await expect(page.getByLabel('Parse_JSON operation icon')).toBeVisible();
      await expect(page.getByLabel('Filter_array operation icon')).toBeVisible();
      await expect(page.getByTestId('collapsed-text-initialize_arrayvariable')).toBeVisible();
      await expect(page.getByTestId('collapsed-text-initialize_arrayvariable')).toContainText('+ 1');

      // Expand first action
      await page.getByTestId('msla-collapsed-card-initialize_arrayvariable').click({ button: 'right' });
      expect(await page.getByText('Expand action', { exact: true })).toBeVisible();
      await page.getByText('Expand action').click({ force: true });
      expect(page.getByText('Initialize ArrayVariable', { exact: true })).toBeVisible();
      await expect(page.getByTestId('msla-collapsed-card-filter_array')).toBeVisible();
    });

    test('Should collapse actions within scope', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Scope');

      // Collapse nested scope
      await page.getByText('Scope nested', { exact: true }).click({ button: 'right' });
      expect(await page.getByText('Collapse action', { exact: true })).toBeVisible();
      await page.getByText('Collapse action').click({ force: true });
      await expect(page.getByTestId('msla-collapsed-card-scope_nested')).toBeVisible();
      await expect(page.getByLabel('Scope_nested operation icon')).toBeVisible();
      await expect(page.getByLabel('Scope_nested_empty operation')).toBeVisible();
      await expect(page.getByTestId('collapsed-text-scope_nested')).not.toBeVisible();
      await expect(page.getByTestId('card-response').getByRole('button', { name: 'Response' })).toBeVisible();

      // Collapse first action
      await page.getByText('Increment variable 2', { exact: true }).click({ button: 'right' });
      expect(await page.getByText('Collapse action', { exact: true })).toBeVisible();
      await page.getByText('Collapse action').click({ force: true });
      await expect(page.getByLabel('Increment_variable_2 operation icon')).toBeVisible();
      await expect(page.getByLabel('Increment_variable_3 operation icon')).toBeVisible();
      await expect(page.getByLabel('Scope_nested operation icon')).toBeVisible();
      await expect(page.getByTestId('card-response').getByRole('button', { name: 'Response' })).toBeVisible();
    });
  }
);

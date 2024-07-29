import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'RunAfter Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('RunAfter visible for all operations (except trigger and action immediately after the trigger', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      await page.getByLabel('Parse JSON operation, Data').click({
        button: 'right',
      });
      await expect(page.getByRole('menuitem', { name: 'Run After' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'Run After' }).click();
      await expect(page.getByLabel('Expand Initialize')).toBeVisible();

      await page.getByLabel('Filter array operation, Data').click({
        button: 'right',
      });
      await expect(page.getByRole('menuitem', { name: 'Run After' })).toBeVisible();
      await page.getByRole('menu').getByText('Run After').click();
      await expect(page.getByLabel('Expand Parse JSON Parse JSON')).toBeVisible();

      await page.getByText('Initialize ArrayVariable', { exact: true }).click({
        button: 'right',
      });
      await expect(page.getByRole('menuitem', { name: 'Run After' })).not.toBeVisible();

      await page.getByText('manual', { exact: true }).click({
        button: 'right',
      });
      await expect(page.getByRole('menuitem', { name: 'Run After' })).not.toBeVisible();
    });
    test('RunAfter visible for all scope operations (except trigger and action immediately after the trigger', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      await page.getByLabel('Insert a new step after HTTP').click();
      await page.getByText('Add an action').click();
      await page.getByPlaceholder('Search').fill('scope');
      await page.getByLabel('Scope').click();
      await page.getByLabel('Scope', { exact: true }).click({
        button: 'right',
      });
      await expect(page.getByRole('menuitem', { name: 'Run After' })).toBeVisible();
      await page.getByRole('menu').getByText('Run After').click();
      await expect(page.getByLabel('Expand HTTP HTTP')).toBeVisible();
    });
  }
);

import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'ContextMenu Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should open node context menus', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Scope');

      // Open trigger context menu
      await page.getByText('manual', { exact: true }).click({ button: 'right' });
      await expect(page.getByText('Copy trigger', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      // Open variable context menu
      await page.getByText('Initialize variable', { exact: true }).click({ button: 'right' });
      await expect(page.getByText('Copy action', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      // Open scope context menu
      await page.getByLabel('Scope operation', { exact: true }).click({ button: 'right' });
      await expect(page.getByText('Copy entire action', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    });

    test('Should open edge context menus', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Scope');

      // Click first edge button
      await page.getByLabel('Insert a new step between manual and Initialize variable').click();
      await expect(page.getByText('Add an action', { exact: true })).toBeVisible();
      await expect(page.getByText('Add a parallel branch', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByLabel('Zoom view to fit').click({ force: true });

      // Click the last edge button
      await page.getByLabel('Insert a new step after Response').click();
      await expect(page.getByText('Add an action', { exact: true })).toBeVisible();
      await expect(page.getByText('Add a parallel branch', { exact: true })).not.toBeVisible();
      await page.keyboard.press('Escape');
    });
  }
);

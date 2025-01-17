import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Scope actions tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should collapse condition actions', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Check items inside conditions exist in true side are visible
      await expect(page.getByTestId('card-terminate').getByRole('button', { name: 'Terminate' })).toBeVisible();
      await expect(page.getByTestId('card-increment_variable_4').getByRole('button', { name: 'Increment variable' })).toBeVisible();

      // Collapse true side
      await page.getByLabel('True condition, collapse').click();

      // Check no actions message is visible
      await expect(page.getByTestId('subgraph-Condition-actions-#subgraph-no-actions')).toBeVisible();

      // Check items inside true side are hidden
      await expect(page.getByTestId('card-terminate').getByRole('button', { name: 'Terminate' })).not.toBeVisible();

      // Check items inside conditions exist in false side are visible
      await expect(page.getByTestId('card-terminate_2').getByRole('button', { name: 'Terminate' })).toBeVisible();

      // Collapse false side
      await page.getByLabel('False condition, collapse').click();

      // Check no actions message is visible
      await expect(page.getByTestId('subgraph-Condition-elseActions-#subgraph-no-actions')).toBeVisible();

      // Check items inside false side are hidden
      await expect(page.getByTestId('card-terminate 2').getByRole('button', { name: 'Terminate' })).not.toBeVisible();

      // Collapse condition
      await page.getByTestId('Condition-collapse-toggle').click();

      // Check items inside condition are hidden
      await expect(page.getByLabel('True condition, collapse')).not.toBeVisible();
      await expect(page.getByLabel('False condition, collapse')).not.toBeVisible();

      // Check no actions message is visible
      await expect(page.getByTestId('scope-Condition-#scope-no-actions')).toBeVisible();
    });

    test('Should collapse for each actions', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Collapse empty foreach
      await page.getByTestId('ForEach_empty-collapse-toggle').click();

      // Check items inside foreach actions are visible
      await expect(page.getByTestId('card-foreach_action_1').getByRole('button', { name: 'ForEach Action' })).toBeVisible();
      await expect(page.getByTestId('card-foreach_action_2').getByRole('button', { name: 'ForEach Action' })).toBeVisible();

      // Collapse nested foreach
      await page.getByTestId('ForEach_nested-collapse-toggle').click();

      // Check items inside foreach actions are hidden
      await expect(page.getByTestId('card-foreach_action_2').getByRole('button', { name: 'ForEach Action' })).not.toBeVisible();

      // Collapse outer most foreach
      await page.getByTestId('ForEach-collapse-toggle').click();

      // Check items inside foreach actions non visible
      await expect(page.getByTestId('card-foreach_action_1').getByRole('button', { name: 'ForEach Action' })).not.toBeVisible();
      await expect(page.getByTestId('card-foreach_action_2').getByRole('button', { name: 'ForEach Action' })).not.toBeVisible();

      // Expand outer most foreach
      await page.getByTestId('ForEach-collapse-toggle').click();

      // Check items inside foreach actions are visible and still collapsed
      await expect(page.getByTestId('card-foreach_action_1').getByRole('button', { name: 'ForEach Action' })).toBeVisible();
      await expect(page.getByLabel('ForEach nested operation')).toBeVisible();
      await expect(page.getByLabel('ForEach empty operation')).toBeVisible();

      // Check message no actions is visible
      await expect(page.getByTestId('scope-ForEach_nested-#scope-no-actions')).toBeVisible();
      await expect(page.getByTestId('scope-ForEach_empty-#scope-no-actions')).toBeVisible();
    });
  }
);

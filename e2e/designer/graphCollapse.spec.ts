import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Graph Collapse Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should collapse graphs', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Collapse and reopen the foreach condition node, confirming the child node visibility
      await expect(page.getByLabel('ForEach operation')).toBeVisible();
      await page.getByTestId('ForEach_Case-collapse-toggle').click();
      await expect(page.getByLabel('ForEach operation')).not.toBeVisible();
      await page.getByTestId('ForEach_Case-collapse-toggle').click();
      await expect(page.getByLabel('ForEach operation')).toBeVisible();

      // Nested collapse and reopen the foreach condition node
      await page.getByTestId('ForEach_Case-collapse-toggle').click({ modifiers: ['Shift'] });
      await page.getByTestId('ForEach_Case-collapse-toggle').click();
      await expect(page.getByTestId('card-foreach_action_2').getByRole('button', { name: 'ForEach Action' })).not.toBeVisible();

      // Collapse and nested reopen the foreach case node
      await page.getByTestId('ForEach_Case-collapse-toggle').click();
      await page.getByTestId('ForEach_Case-collapse-toggle').click({ modifiers: ['Shift'] });
      await expect(page.getByTestId('card-foreach_action_2').getByRole('button', { name: 'ForEach Action' })).toBeVisible();
    });
  }
);

import test, { expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Agent Settings Token Filtering Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('changing Agent responseFormat.type parameter should update dynamic parameter tokens', async ({ page }) => {
      await page.goto('/');

      // Navigate to a workflow that has Agent operations
      await GoToMockWorkflow(page, 'Agent'); // Assuming there's an Agent workflow

      // Click on the Agent operation to open its settings
      await page.getByLabel('Agent operation').click();

      // Navigate to settings panel
      await page.getByRole('button', { name: 'Settings' }).click();

      // Find the responseFormat.type parameter
      await page.locator('[data-automation-id="responseFormat.type"]').click();

      // Set to json_schema and verify only body tokens are available
      await page.selectOption('[data-automation-id="responseFormat.type"]', { label: 'json_schema' });

      // Navigate to a parameter field that uses dynamic content
      await page.getByLabel('Input parameter field').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();

      // Verify only body-related tokens are shown
      await expect(page.getByRole('button', { name: /body/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'outputs' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'lastAssistantMessage' })).not.toBeVisible();

      // Close token picker
      await page.keyboard.press('Escape');

      // Change to json_object and verify only outputs tokens are available
      await page.locator('[data-automation-id="responseFormat.type"]').click();
      await page.selectOption('[data-automation-id="responseFormat.type"]', { label: 'json_object' });

      // Open token picker again
      await page.getByLabel('Input parameter field').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();

      // Verify only outputs token is shown
      await expect(page.getByRole('button', { name: 'outputs' })).toBeVisible();
      await expect(page.getByRole('button', { name: /body/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'lastAssistantMessage' })).not.toBeVisible();

      // Close token picker
      await page.keyboard.press('Escape');

      // Change to text and verify only outputs tokens are available
      await page.locator('[data-automation-id="responseFormat.type"]').click();
      await page.selectOption('[data-automation-id="responseFormat.type"]', { label: 'text' });

      // Open token picker again
      await page.getByLabel('Input parameter field').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();

      // Verify only outputs token is shown
      await expect(page.getByRole('button', { name: 'outputs' })).toBeVisible();
      await expect(page.getByRole('button', { name: /body/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'lastAssistantMessage' })).not.toBeVisible();

      // Close token picker
      await page.keyboard.press('Escape');

      // Remove/clear the responseFormat.type and verify default behavior (lastAssistantMessage)
      await page.locator('[data-automation-id="responseFormat.type"]').click();
      await page.selectOption('[data-automation-id="responseFormat.type"]', { label: '' }); // Clear selection

      // Open token picker again
      await page.getByLabel('Input parameter field').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();

      // Verify only lastAssistantMessage token is shown (default case)
      await expect(page.getByRole('button', { name: 'lastAssistantMessage' })).toBeVisible();
      await expect(page.getByRole('button', { name: /body/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'outputs' })).not.toBeVisible();
    });

    test('Agent token filtering should not affect other operation types', async ({ page }) => {
      await page.goto('/');

      // Navigate to a workflow with mixed operations
      await GoToMockWorkflow(page, 'Panel'); // Using Panel workflow as it has non-Agent operations

      // Click on a non-Agent operation (e.g., Parse JSON)
      await page.getByLabel('Parse JSON operation, Data').click();
      await page.getByLabel('Content').click();

      // Open token picker
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();

      // Verify all expected tokens are available for non-Agent operations
      await expect(page.getByRole('button', { name: /body/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /outputs/i })).toBeVisible();

      // This confirms that filtering only affects Agent operations
    });
  }
);

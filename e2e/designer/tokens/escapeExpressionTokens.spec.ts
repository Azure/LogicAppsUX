import test, { expect } from '@playwright/test';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';

test.describe(
  'Escape Expression Tokens Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Expressions should be able to use escape characters and serialize', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');
      await page.getByLabel('HTTP operation, HTTP connector').click();
      await page.getByTitle('Enter request content').getByRole('paragraph').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-expression"]').click();
      const viewLine = page.locator('.view-line').first();
      await viewLine.click();
      // full expression not typed out because Monaco automatically fills closing brackets and single quotes
      await viewLine.pressSequentially("array(split(variables('ArrayVariable'), '\n");
      await page.getByRole('tab', { name: 'Dynamic content' }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "Http", "inputs": { "uri": "http://test.com", "method": "GET", "body": "@{variables(\'ArrayVariable\')}@{array(split(variables (\'ArrayVariable\'), \'\\r\\n\'))}" }, "runAfter": { "Filter_array": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
      );
    });

    test('Expressions should be able to use escaped escape characters and serialize as the same', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');
      await page.getByLabel('HTTP operation, HTTP connector').click();
      await page.getByTitle('Enter request content').getByRole('paragraph').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-expression"]').click();
      const viewLine = page.locator('.view-line').first();
      await viewLine.click();
      // full expression not typed out because Monaco automatically fills closing brackets and single quotes
      await viewLine.pressSequentially("array(split(variables('ArrayVariable'), '\\n");
      await page.getByRole('tab', { name: 'Dynamic content' }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "Http", "inputs": { "uri": "http://test.com", "method": "GET", "body": "@{variables(\'ArrayVariable\')}@{array(split(variables (\'ArrayVariable\'), \'\\n\'))}" }, "runAfter": { "Filter_array": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
      );
    });
  }
);

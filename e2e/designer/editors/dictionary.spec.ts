import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';

test.describe(
  'dictionary editor',
  {
    tag: '@mock',
  },
  async () => {
    test('Should handle dictionary serialization', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      await page.getByLabel('Insert a new step between Initialize ArrayVariable and Parse JSON').click();
      await page.getByText('Add an action').click();
      await page.getByLabel('HTTP', { exact: true }).first().click();
      await page.getByLabel('HTTP', { exact: true }).click();
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-headers-key-0').click();
      await page.keyboard.type('testkey');
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-headers-value-0').click();
      await page.keyboard.type('testValue');
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-headers-key-1').click();
      await page.keyboard.type('testkey2');
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-headers-value-1').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();
      await page.getByRole('button', { name: 'string' }).click();
      await page.getByLabel('Switch to text mode').first().click();

      await page.getByRole('tab', { name: 'Code view' }).click();
      // because code view does serialization, it sometimes takes a bit of time to update
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 3000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "Http", "inputs": { "uri": "", "method": "", "headers": { "testkey": "testValue", "testkey2": "@{triggerBody()?[\'string\']}" } }, "runAfter": { "Initialize_ArrayVariable": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
      );
      await page.getByRole('tab', { name: 'Parameters' }).click();

      // verify delete
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-headers-value-1').click();
      await page.getByLabel('Click to delete item').nth(1).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      // because code view does serialization, it sometimes takes a bit of time to update
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 3000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "Http", "inputs": { "uri": "", "method": "", "headers": { "testkey": "testValue" } }, "runAfter": { "Initialize_ArrayVariable": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
      );
    });

    test('Should not do value string interpolation if is of type `any` and has a token', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      await page.getByLabel('Insert a new step between Initialize ArrayVariable and Parse JSON').click();
      await page.getByText('Add an action').click();
      await page.getByPlaceholder('Search for an action or').fill('select');
      await page.getByLabel('Select', { exact: true }).click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-from').click();
      await page.keyboard.type('[]');
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-map-key-0').click();
      await page.keyboard.type('test');
      await page.getByTestId('msla-setting-token-editor-dictionaryeditor-map-value-0').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();
      await page.getByRole('button', { name: 'ArrayVariable', exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 3000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "Select", "inputs": { "from": [], "select": { "test": "@variables(\'ArrayVariable\')" } }, "runAfter": { "Initialize_ArrayVariable": [ "SUCCEEDED" ] }}'
      );
    });
  }
);

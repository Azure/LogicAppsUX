import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';

test(
  'dictionary editor',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');

    await GoToMockWorkflow(page, 'Panel');
    await page.getByLabel('Insert a new step between Initialize ArrayVariable and Parse JSON').click();
    await page.getByText('Add an action').click();
    await page.getByLabel('HTTP', { exact: true }).click();
    await page.getByLabel('HTTP', { exact: true }).click();
    await page.getByLabel('Headers key item').getByRole('paragraph').click();
    await page.getByLabel('Headers key item').fill('testkey');
    await page.getByLabel('Headers value item').getByRole('paragraph').click();
    await page.getByLabel('Headers value item 0').fill('testValue');
    await page.getByLabel('Headers key item 1').getByRole('paragraph').click();
    await page.getByLabel('Headers key item 1').fill('testkey2');
    await page.getByLabel('Headers value item 1').getByRole('paragraph').click();
    await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]').click();
    await page.getByRole('button', { name: 'string' }).click();
    await page.getByLabel('Switch to text mode').first().click();

    await page.getByRole('tab', { name: 'Code view' }).click();
    // because code view does serialization, it sometimes takes a bit of time to update
    await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('loading'), { timeout: 3000 });
    await expect(page.getByRole('code')).toContainText(
      '{ "type": "Http", "inputs": { "uri": "", "method": "", "headers": { "testkey": "testValue", "testkey2": "@{triggerBody()?[\'string\']}" } }, "runAfter": { "Initialize_ArrayVariable": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
    );
    await page.getByRole('tab', { name: 'Parameters' }).click();

    // verify delete
    await page.getByLabel('Headers value item 1').getByRole('paragraph').click();
    await page.getByLabel('Click to delete item').nth(1).click();
    await page.getByRole('tab', { name: 'Code view' }).click();
    // because code view does serialization, it sometimes takes a bit of time to update
    await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('loading'), { timeout: 3000 });
    await expect(page.getByRole('code')).toContainText(
      '{ "type": "Http", "inputs": { "uri": "", "method": "", "headers": { "testkey": "testValue" } }, "runAfter": { "Initialize_ArrayVariable": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
    );
  }
);

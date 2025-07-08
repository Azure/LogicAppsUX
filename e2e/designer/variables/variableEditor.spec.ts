import { test, expect } from '@playwright/test';

test.describe(
  'Variable Editor Tests',
  {
    tag: '@mock',
  },
  () => {
    test(
      'Should be able to add/delete new variables and serialize correctly',
      {
        tag: '@mock',
      },
      async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.getByText('Local', { exact: true }).click();

        // enable multivariable
        await page.getByRole('heading', { name: '▼ Context Settings' }).click();
        await page.getByText('Enable Multivariable').click();
        await page.getByRole('heading', { name: '▼ Context Settings' }).click();

        await page.getByText('Select an option').click();
        await page.getByRole('option', { name: 'Multi Variable', exact: true }).click();
        await page.waitForTimeout(100);
        await page.getByRole('button', { name: 'Yes' }).click();
        await page.getByRole('button', { name: 'Toolbox' }).click();
        await page.getByLabel('Zoom view to fit').click({ force: true });

        await page.getByTestId('card-initialize_variables_2').getByRole('button', { name: 'Initialize variables' }).click();

        await page.getByLabel('Delete').nth(1).click();
        await page.getByLabel('Delete').first().click();
        await page.getByRole('tab', { name: 'Code view' }).click();
        await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
        await expect(page.getByRole('code')).toContainText(
          '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testVariable3", "type": "array", "value": [] } ] }, "runAfter": {}}'
        );

        await page.getByRole('tab', { name: 'Parameters' }).click();
        await page.getByLabel('Add a Variable').click();

        await page.waitForTimeout(100);

        await page.getByTestId('msla-setting-token-editor-initializevariableeditor-variables-name-1').click();
        await page.keyboard.type('newVariable');

        await page.getByText('Select variable type').click();
        await page.getByRole('option', { name: 'Integer' }).click();

        await page.getByTestId('msla-setting-token-editor-initializevariableeditor-variables-value-1').click();
        await page.keyboard.type('17');

        await page.getByRole('tab', { name: 'Code view' }).click();
        await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
        await expect(page.getByRole('code')).toContainText(
          '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testVariable3", "type": "array", "value": [] }, { "name": "newVariable", "type": "integer", "value": 17 } ] }, "runAfter": {}}'
        );
      }
    );
  }
);

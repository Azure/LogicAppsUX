import { test, expect } from '@playwright/test';

test.describe(
  'MultiVariable Tests',
  {
    tag: '@mock',
  },
  () => {
    test(
      'Should be able to combine Initialize Variables',
      {
        tag: '@mock',
      },
      async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
          localStorage.clear();
          localStorage.setItem('control-expand-collapse-button', 'true');
        });
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
        await page.getByRole('tab', { name: 'Code view' }).click();
        await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
        await expect(page.getByRole('code')).toContainText(
          '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testVariable1", "type": "string", "value": "123" }, { "name": "testVariable2", "type": "float", "value": 123.5 }, { "name": "testVariable3", "type": "array", "value": [] } ] }, "runAfter": {}}'
        );

        await page.getByTestId('card-initialize_variables_5').getByRole('button', { name: 'Initialize variables' }).click();
        await page.getByRole('tab', { name: 'Code view' }).click();
        await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
        await expect(page.getByRole('code')).toContainText(
          '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testBoolean1", "type": "boolean", "value": true }, { "name": "testBoolean2", "type": "boolean", "value": false }, { "name": "testInteger", "type": "integer", "value": 15 } ] }, "runAfter": { "Scope": [ "SUCCEEDED" ] }}'
        );
      }
    );

    test.skip('Should be able to opt out of combining Initialize Variables', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('control-expand-collapse-button', 'true');
      });
      await page.getByText('Local', { exact: true }).click();

      // enable multivariable
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();
      await page.getByText('Enable Multivariable').click();
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();

      await page.getByText('Select an option').click();
      await page.getByRole('option', { name: 'Multi Variable', exact: true }).click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'No' }).click();
      await page.getByRole('button', { name: 'Toolbox' }).click();
      await page.getByLabel('Zoom view to fit').click({ force: true });

      await page.getByLabel('Zoom view to fit').press('ControlOrMeta+Shift+P');
      await expect(page.getByLabel('Initialize variables 1', { exact: true })).toContainText('Initialize variables 1');
      await expect(page.getByLabel('Initialize variables 3', { exact: true })).toContainText('Initialize variables 3');
      await expect(page.getByLabel('Initialize variables 4', { exact: true })).toContainText('Initialize variables 4');
      await expect(page.getByLabel('Initialize variables 5', { exact: true })).toContainText('Initialize variables 5');
      await expect(page.getByLabel('Initialize variables 2', { exact: true })).toContainText('Initialize variables 2');
      await expect(page.getByLabel('Initialize variables', { exact: true })).toContainText('Initialize variables');
      await page.getByLabel('Initialize variables 4', { exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testBoolean2", "type": "boolean", "value": false } ] }, "runAfter": { "Initialize_variables_3": [ "SUCCEEDED" ] }}'
      );
      await page.getByTestId('card-initialize_variables_1').getByRole('button', { name: 'Initialize variables' }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testVariable2", "type": "float", "value": 123.5 } ] }, "runAfter": { "Initialize_variables": [ "SUCCEEDED" ] }}'
      );
    });

    test('Should be able to remember to combine/not to combine Initialize Variables', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('control-expand-collapse-button', 'true');
      });
      await page.getByText('Local', { exact: true }).click();

      // enable multivariable
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();
      await page.getByText('Enable Multivariable').click();
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();

      await page.getByText('Select an option').click();
      await page.getByRole('option', { name: 'Multi Variable', exact: true }).click();
      await page.waitForTimeout(100);
      await page.getByLabel('Remember my choice').check();
      await page.getByRole('button', { name: 'Yes' }).click();
      await page.getByRole('button', { name: 'Toolbox' }).click();
      await page.getByLabel('Zoom view to fit').click({ force: true });

      await page.waitForFunction(() => localStorage.getItem('msla-combine-initialize-variables') !== null);

      // Confirm that the remember is stored in local storage
      expect((await page.evaluate(() => localStorage.getItem('msla-combine-initialize-variables') ?? '')) === 'true').toBeTruthy();

      await page.getByTestId('card-initialize_variables_2').getByRole('button', { name: 'Initialize variables' }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testVariable1", "type": "string", "value": "123" }, { "name": "testVariable2", "type": "float", "value": 123.5 }, { "name": "testVariable3", "type": "array", "value": [] } ] }, "runAfter": {}}'
      );

      await page.goto('/');
      // enable multivariable
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();
      await page.getByText('Enable Multivariable').click();
      await page.getByRole('heading', { name: '▼ Context Settings' }).click();

      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Select an option').click();
      await page.getByRole('option', { name: 'Multi Variable', exact: true }).click();
      await page.getByRole('button', { name: 'Toolbox' }).click();
      await page.getByLabel('Zoom view to fit').click();
      await page.getByTestId('card-initialize_variables_2').getByRole('button', { name: 'Initialize variables' }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      await page.waitForFunction(() => !document.querySelector('#code-view')?.textContent?.includes('Loading'), { timeout: 1000 });
      await expect(page.getByRole('code')).toContainText(
        '{ "type": "InitializeVariable", "inputs": { "variables": [ { "name": "testVariable1", "type": "string", "value": "123" }, { "name": "testVariable2", "type": "float", "value": 123.5 }, { "name": "testVariable3", "type": "array", "value": [] } ] }, "runAfter": {}}'
      );
    });
  }
);

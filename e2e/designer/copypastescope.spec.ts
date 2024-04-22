import { test, expect } from '@playwright/test';

test(
  'Expect Copy and Paste of Scopes to work on single workflow',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');
    await page.getByText('Select an option').click();
    await page.getByRole('option', { name: 'Panel' }).click();
    await page.getByRole('button', { name: 'Toolbox' }).click();

    await page.getByTestId('rf__edge-For_each-Filter_array').getByLabel('Insert a new step between For').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('switch');
    await page.getByLabel('Switch Identifies a single').click();
    await page.getByLabel('Add Case').click();
    await page.getByRole('paragraph').click();
    await page.getByLabel('Equals').fill('test');
    await page.getByTestId('rf__node-Switch-#scope').getByRole('button', { name: 'Switch' }).click();
    await page.getByRole('paragraph').click();
    await page.locator('button').filter({ hasText: '' }).click();
    await page.getByRole('button', { name: 'Current item' }).click();
    await page.getByLabel('Add Case').click();
    await page.getByTestId('rf__node-Case 2-#subgraph').getByLabel('Insert a new step in Case').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('http');
    await page.getByLabel('HTTP Choose a REST API to').click();
    await page.getByLabel('URI').getByRole('paragraph').click();
    await page.getByLabel('URI').getByRole('paragraph').click();
    await page.getByLabel('URI').fill('http://test.com');
    await page.getByRole('combobox', { name: 'Method' }).click();
    await page.getByRole('option', { name: 'GET' }).click();
    await page.getByLabel('Insert a new step in Case').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('compo');
    await page.getByLabel('Compose Constructs an').click();
    await page.getByTestId('rf__node-Switch-#scope').getByRole('button', { name: 'Switch' }).click({
      button: 'right',
    });
    await page.getByText('Copy Subgraph').click();
    await page.getByTestId('rf__edge-Switch-Filter_array').getByLabel('Insert a new step between').click();
    await page.getByText('Paste an action').click();
    await page.getByTestId('rf__node-Switch-copy-#scope').getByRole('button', { name: 'Switch-copy' }).click();
    await expect(page.getByLabel('On', { exact: true }).locator('div')).toContainText('Current item');
    await page.getByTestId('card-HTTP 2').getByLabel('HTTP operation, HTTP connector').click();
    await expect(page.getByLabel('URI').locator('span')).toContainText('http://test.com');
    await expect(page.getByRole('combobox', { name: 'Method' })).toHaveValue('GET');
    await page.getByTestId('card-Compose 1').getByLabel('Compose New operation').click();
  }
);

import { test } from '@playwright/test';

test.describe(
  'Custom Code',
  {
    tag: '@real',
  },
  () => {
    test('Inline Javascript', async ({ page, request, browserName }) => {
      await page.goto('/');
      await page.getByPlaceholder('Select an App').click({ timeout: 20000 });
      await page.getByPlaceholder('Select an App').fill(`wapp-lauxtest${browserName}`, { timeout: 20000 });
      await page.getByPlaceholder('Select an App').press('Enter', { timeout: 20000 });
      await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click({ timeout: 20000 });
      await page.getByRole('option', { name: 'inlineJS' }).click({ timeout: 20000 });
      await page.getByRole('button', { name: 'Toolbox' }).click({ timeout: 20000 });

      await page.getByRole('button', { name: 'Insert a new step between' }).first().click();
      await page.getByText('Add an action').click();
      await page.getByPlaceholder('Search').fill('javascript');
      await page.getByLabel('Execute JavaScript Code').click();
      await page.locator('.monaco-editor').nth(0).click();
      await page.keyboard.type('return `javascript: ${');
      await page.getByRole('button', { name: 'Add dynamic content Button to' }).click();
      await page.getByRole('button', { name: 'Body' }).click();
      await page.locator('.monaco-editor').nth(0).click();
      await page.keyboard.type(';');
      await page.getByText('code', { exact: true }).click();
      await page.getByLabel('Response operation, Request').click();
      await page.getByLabel('Body').click();
      await page.locator('button').filter({ hasText: '' }).click();
      await page.getByRole('button', { name: 'Outputs' }).click();
      await page.getByRole('menuitem', { name: 'Save' }).click();

      await page.waitForResponse((resp) => resp.url().includes('/deployWorkflowArtifacts') && resp.status() === 200);
      await page.waitForTimeout(6000);
      await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click({ timeout: 20000 });
      const value = await page.getByRole('textbox', { name: 'URL will be generated after' }).inputValue();
      const LAResult = await request.post(value, {
        data: `hello ${browserName}`,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
      test.expect(LAResult.status()).toBe(200);
      test.expect(await LAResult.text()).toBe(`javascript: hello ${browserName}`);
    });
  }
);

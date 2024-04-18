import { expect, test } from '@playwright/test';

test.describe(
  'Sanity Check',
  {
    tag: '@real',
  },
  () => {
    test('Sanity Check', async ({ page, request, browserName }) => {
      await page.goto('/');
      await page.getByPlaceholder('Select an App').click({ timeout: 20000 });
      await page.getByPlaceholder('Select an App').fill(`wapp-lauxtest${browserName}`, { timeout: 20000 });
      await page.getByPlaceholder('Select an App').press('Enter', { timeout: 20000 });
      await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click({ timeout: 20000 });
      await page.getByRole('option', { name: 'testWorkflow1' }).click({ timeout: 20000 });
      await page.getByRole('button', { name: 'Toolbox' }).click({ timeout: 20000 });
      await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click({ timeout: 20000 });
      await page.getByRole('combobox', { name: 'Method' }).click({ timeout: 20000 });
      await page.getByRole('option', { name: 'GET' }).click({ timeout: 20000 });
      await page.getByLabel('Insert a new step after When').click({ timeout: 20000 });
      await page.getByRole('menuitem', { name: 'Add an action' }).click({ timeout: 20000 });
      await page.getByPlaceholder('Search').fill('response', { timeout: 20000 });
      await page.getByLabel('Response This is an incoming').click({ timeout: 20000 });
      await page.getByLabel('Body').getByRole('paragraph').click({ timeout: 20000 });
      await page.getByLabel('Body').fill('Test Body', { timeout: 20000 });
      await page.getByRole('menuitem', { name: 'Save Save' }).click({ timeout: 20000 });

      await page.waitForResponse((resp) => resp.url().includes('/deployWorkflowArtifacts') && resp.status() === 200);
      await page.waitForTimeout(6000);
      await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click({ timeout: 20000 });
      const value = await page.getByRole('textbox', { name: 'URL will be generated after' }).inputValue();
      const LAResult = await request.get(value);
      expect(LAResult.status()).toBe(200);
      expect(await LAResult.text()).toBe('Test Body');
    });
  }
);

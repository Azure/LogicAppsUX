import { expect, test } from '@playwright/test';
import { GoToWorkflow } from '../utils/GoToWorkflow';

test.describe(
  'Sanity Check',
  {
    tag: '@real',
  },
  () => {
    test('Sanity Check', async ({ page, request, browserName }) => {
      await page.goto('/');
      await GoToWorkflow(page, `wapp-lauxtest2${browserName}`, 'testWorkflow1');
      await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click();
      await page.getByRole('combobox', { name: 'Method' }).click();
      await page.getByRole('option', { name: 'GET' }).click();
      await page.getByLabel('Insert a new step after When').click();
      await page.getByRole('menuitem', { name: 'Add an action' }).click();
      await page.getByPlaceholder('Search').fill('response',);
      await page.getByLabel('Response This is an incoming').click();
      await page.getByLabel('Body').getByRole('paragraph').click();
      await page.getByLabel('Body').fill('Test Body',);
      await page.getByRole('menuitem', { name: 'Save Save' }).click();

      await page.waitForResponse((resp) => resp.url().includes('/deployWorkflowArtifacts') && resp.status() === 200);
      await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click();
      const value = await page.getByRole('textbox', { name: 'URL will be generated after' }).inputValue();
      await request.get(value);
      const LAResult = await request.get(value);
      expect(LAResult.status()).toBe(200);
      expect(await LAResult.text()).toBe('Test Body');
    });
  }
);

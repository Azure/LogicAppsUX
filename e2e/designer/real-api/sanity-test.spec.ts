import { expect, test } from '@playwright/test';

test.describe(
    'Sanity Check',
    {
        tag: '@real',
    }, () => {

        test('Sanity Check', async ({ page, request, browserName }) => {
            await page.goto('/');
            await page.getByPlaceholder('Select an App').click();
            await page.getByPlaceholder('Select an App').fill(`wapp-lauxtest${browserName}`);
            await page.getByPlaceholder('Select an App').press('Enter');
            await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click();
            await page.getByRole('option', { name: 'testWorkflow1' }).click();
            await page.getByRole('button', { name: 'Toolbox' }).click();
            await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click();
            await page.getByRole('combobox', { name: 'Method' }).click();
            await page.getByRole('option', { name: 'GET' }).click();
            await page.getByLabel('Insert a new step after When').click();
            await page.getByRole('menuitem', { name: 'Add an action' }).click();
            await page.getByPlaceholder('Search').fill('response');
            await page.getByLabel('Response This is an incoming').click();
            await page.getByLabel('Body').getByRole('paragraph').click();
            await page.getByLabel('Body').fill('Test Body');
            await page.getByRole('menuitem', { name: 'Save Save' }).click();

            await page.waitForResponse((resp) => resp.url().includes('/deployWorkflowArtifacts') && resp.status() === 200);
            await page.waitForTimeout(6000);
            await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click();
            const value = await page.getByRole('textbox', { name: 'URL will be generated after' }).inputValue();
            const LAResult = await request.get(value);
            expect(LAResult.status()).toBe(200);
            expect(await LAResult.text()).toBe('Test Body');
        })
    });
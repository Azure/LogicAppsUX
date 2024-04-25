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
            await page.getByRole('option', { name: 'statelessVariables' }).click({ timeout: 20000 });
            await page.getByRole('button', { name: 'Toolbox' }).click({ timeout: 20000 });

            await page.getByRole('button', { name: 'Insert a new step between' }).first().click();
            await page.getByRole('menuitem', { name: 'Add an action' }).click();
            await page.getByPlaceholder('Search').click();
            await page.getByPlaceholder('Search').fill('init');
            await page.getByLabel('Initialize variable').click();
            await page.getByRole('paragraph').click();

            await page.getByLabel('Name').fill('v1');
            await page.getByText('Boolean').click();
            await page.getByRole('option', { name: 'Array' }).click();
            await page.getByLabel('Value').getByRole('paragraph').click();
            await page.getByLabel('Value').fill('[1,2]');

            await page.locator('#msla-node-details-panel-Initialize_variable div').filter({ hasText: 'Namev1Add dynamic data or' }).first().click();
            await page.getByTestId('rf__edge-Initialize_variable-Response').getByLabel('Insert a new step between').click();
            await page.getByRole('menuitem', { name: 'Add an action' }).click();
            await page.getByPlaceholder('Search').fill('Append to array variable');
            await page.getByLabel('Append to array variable').click();
            await page.getByLabel('Name').locator('span').first().click();
            await page.getByRole('option', { name: 'v1' }).click();
            await page.getByRole('paragraph').click();
            await page.getByLabel('Value').fill('3');
            await page.getByTestId('rf__edge-Append_to_array_variable-Response').getByRole('button', { name: 'Insert a new step between' }).first().click();
            await page.getByText('Add an action').click();
            await page.getByPlaceholder('Search').fill('initalize');
            await page.getByLabel('Initialize variable Initializes a variable.').click();
            await page.getByRole('paragraph').click();
            await page.getByLabel('Name').fill('v2');
            await page.getByText('Boolean').click();
            await page.getByRole('option', { name: 'String' }).click();
            await page.getByLabel('Value').getByRole('paragraph').click();
            await page.getByLabel('Value').fill('foo');
            await page.getByTestId('rf__edge-Initialize_variable_1-Response').getByLabel('Insert a new step between').click();
            await page.getByRole('menuitem', { name: 'Add an action' }).click();
            await page.getByPlaceholder('Search').fill('append string');
            await page.getByLabel('Append to string variable').click();
            await page.getByLabel('Name').locator('span').first().click();
            await page.getByRole('option', { name: 'v2' }).click();
            await page.getByRole('paragraph').click();
            await page.getByLabel('Value').fill(browserName);
            await page.getByLabel('Response operation, Request').click();
            await page.getByLabel('Body').getByRole('paragraph').click();
            await page.locator('button').filter({ hasText: '' }).click();
            await page.getByRole('button', { name: 'v1' }).click();
            await page.locator('button').filter({ hasText: '' }).click();
            await page.getByRole('button', { name: 'v2' }).click();
            await page.getByText('Advanced parametersShowing 0').click();
            await page.getByLabel('fit view').click();
            await page.getByRole('menuitem', { name: 'Save' }).click();

            await page.waitForResponse((resp) => resp.url().includes('/deployWorkflowArtifacts') && resp.status() === 200);
            await page.waitForTimeout(6000);
            await page.getByTestId('card-When a HTTP request is received').getByLabel('When a HTTP request is').click({ timeout: 20000 });
            const value = await page.getByRole('textbox', { name: 'URL will be generated after' }).inputValue();
            const LAResult = await request.get(value);
            test.expect(LAResult.status()).toBe(200);
            test.expect(await LAResult.text()).toBe(`[1,2,3]foo${browserName}`);
        });
    }
);

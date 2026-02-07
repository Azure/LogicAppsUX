import { expect, test } from '../../fixtures/real-api';

test.describe(
  'Connection auth type checks',
  {
    tag: '@real',
  },
  () => {
    test('OAuth check', async ({ page, realDataApi }) => {
      await realDataApi.goToWorkflow('OperationParameters');

      await page.getByLabel('Insert a new step after').click();
      await page.getByText('Add an action').click();
      await page.getByPlaceholder('Search for an action or').click();
      await page.getByPlaceholder('Search for an action or').fill('security copilot');
      await page.getByLabel('Discovery Panel').getByText('Run a Security Copilot').click();
      // Should have no valid connections, will load into the connection creation view
      await expect(page.getByText('Create a new connection')).toBeVisible();
      await expect(page.getByText('Authentication type*')).toBeVisible();
      await expect(page.getByText('OAuth')).toBeVisible();
      await expect(page.getByText('Sign in to create a connection')).toBeVisible();
      await expect(page.getByLabel('Sign in to connector')).toBeVisible();
    });
    test('Legacy service principal + client cert check', async ({ page, realDataApi }) => {
      await realDataApi.goToWorkflow('OperationParameters');
      await page.getByLabel('Insert a new step after').click();
      await page.getByText('Add an action').click();
      await page.getByPlaceholder('Search for an action or').click();
      await page.getByPlaceholder('Search for an action or').fill('dataverse');
      await page.getByLabel('Discovery Panel').getByText('Add a new row').click();
      // Should have no valid connections, will load into the connection creation view
      await expect(page.getByText('Create a new connection')).toBeVisible();
      // Select service principal auth type
      await page.getByText('Oauth').click();
      await page.getByRole('option', { name: 'Service Principal' }).click();
      await expect(page.getByText('Client ID*')).toBeVisible();
      await expect(page.getByText('Client Secret*')).toBeVisible();
      await expect(page.getByText('Tenant*')).toBeVisible();
      // Select client cert auth type
      await page.getByText('Service Principal').click();
      await page.getByRole('option', { name: 'Client Certificate Auth' }).click();
      await expect(page.getByText('Tenant*')).toBeVisible();
      await expect(page.getByText('Client ID*')).toBeVisible();
      await expect(page.getByText('Client certificate secret*')).toBeVisible();
      await expect(page.getByText('Upload PFX File*')).toBeVisible();
    });
  }
);

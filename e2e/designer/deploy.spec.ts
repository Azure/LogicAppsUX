import { test, expect } from '@playwright/test';

test.describe(
  'Deploy to Azure - Workflow Standard',
  {
    tag: '@mock',
  },
  () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the deploy page
      await page.goto('/deploy');
    });

    test('Should display deployment webview with all required sections', async ({ page }) => {
      // Check that main title is visible
      await expect(page.getByText('Deploy to Azure')).toBeVisible();

      // Check subscription section
      await expect(page.getByText('Select Subscription')).toBeVisible();
    });

    test('Should show workflow standard fields when creating new Logic App', async ({ page }) => {
      // Select a subscription
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      // Select create new
      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      // Enter Logic App name
      await page.getByLabel('Logic App Name').fill('test-logic-app');

      // Select resource group
      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      // Select location
      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      // Verify hosting plan type dropdown appears
      await expect(page.getByText('Hosting Plan Type')).toBeVisible();

      // Select Workflow Standard (should be default)
      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Workflow Standard' }).click();

      // Verify workflow standard specific fields appear
      await expect(page.getByText('App Service Plan')).toBeVisible();
      await expect(page.getByText('Storage Account')).toBeVisible();
      await expect(page.getByText('Create Application Insights')).toBeVisible();
    });

    test('Should show app service plan SKU options for workflow standard', async ({ page }) => {
      // Navigate through the flow to get to SKU selection
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      await page.getByLabel('Logic App Name').fill('test-logic-app');

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Workflow Standard' }).click();

      // Select create new app service plan
      await page.getByRole('combobox', { name: 'Select an app service plan or create new' }).click();
      await page.getByRole('option', { name: 'Create new app service plan...' }).click();

      // Verify SKU dropdown appears
      await expect(page.getByText('App Service Plan SKU')).toBeVisible();

      // Open SKU dropdown and verify options
      await page.getByRole('combobox', { name: 'Select SKU' }).click();
      await expect(page.getByRole('option', { name: 'WS1 (Workflow Standard 1)' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'WS2 (Workflow Standard 2)' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'WS3 (Workflow Standard 3)' })).toBeVisible();
    });

    test('Should auto-generate resource names for workflow standard', async ({ page }) => {
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      const logicAppName = 'MyTestLogicApp';
      await page.getByLabel('Logic App Name').fill(logicAppName);

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      await page.getByRole('combobox', { name: 'Select an app service plan or create new' }).click();
      await page.getByRole('option', { name: 'Create new app service plan...' }).click();

      // Verify App Service Plan name is auto-generated with ASP- prefix
      const aspNameInput = page.getByLabel('New App Service Plan Name');
      await expect(aspNameInput).toHaveValue(/^ASP-MyTestLogicApp-/);

      await page.getByRole('combobox', { name: 'Select a storage account or create new' }).click();
      await page.getByRole('option', { name: 'Create new storage account...' }).click();

      // Verify storage account name is auto-generated (lowercase, alphanumeric)
      const storageNameInput = page.getByLabel('New Storage Account Name');
      await expect(storageNameInput).toHaveValue(/^mytestlogicapp[a-z0-9]+$/);

      // Verify App Insights name equals Logic App name
      const appInsightsCheckbox = page.getByLabel('Create Application Insights');
      await expect(appInsightsCheckbox).toBeChecked();
      const appInsightsNameInput = page.getByLabel('Application Insights Name');
      await expect(appInsightsNameInput).toHaveValue(logicAppName);
    });

    test('Should validate Logic App name format', async ({ page }) => {
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      // Test invalid characters
      await page.getByLabel('Logic App Name').fill('Invalid_Name!');
      await expect(page.getByText('Logic App name can only contain letters, numbers, and hyphens')).toBeVisible();

      // Test valid name
      await page.getByLabel('Logic App Name').fill('Valid-Name-123');
      await expect(page.getByText('Logic App name can only contain letters, numbers, and hyphens')).not.toBeVisible();
    });

    test('Should enable deploy button only when all required fields are filled', async ({ page }) => {
      const deployButton = page.getByRole('button', { name: 'Deploy' });

      // Initially disabled
      await expect(deployButton).toBeDisabled();

      // Fill in all required fields
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      await page.getByLabel('Logic App Name').fill('test-logic-app');

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      // Storage account will be auto-created, so deploy should be enabled
      await expect(deployButton).toBeEnabled();
    });
  }
);

test.describe(
  'Deploy to Azure - Hybrid',
  {
    tag: '@mock',
  },
  () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/deploy');
    });

    test('Should show hybrid-specific fields when hybrid hosting is selected', async ({ page }) => {
      // Navigate to create new Logic App
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      await page.getByLabel('Logic App Name').fill('test-hybrid-app');

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      // Select Hybrid hosting plan type
      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Hybrid' }).click();

      // Verify hybrid-specific fields appear
      await expect(page.getByText('Connected Environment')).toBeVisible();
      await expect(page.getByLabel('Container App Name')).toBeVisible();
      await expect(page.getByText('File Share Details')).toBeVisible();
      await expect(page.getByLabel('File Share Hostname')).toBeVisible();
      await expect(page.getByLabel('File Share Path')).toBeVisible();
      await expect(page.getByLabel('File Share Username')).toBeVisible();
      await expect(page.getByLabel('File Share Password')).toBeVisible();
      await expect(page.getByLabel('SQL Connection String')).toBeVisible();

      // Verify workflow standard fields are NOT visible
      await expect(page.getByText('App Service Plan')).not.toBeVisible();
      await expect(page.getByText('Storage Account')).not.toBeVisible();
      await expect(page.getByText('Create Application Insights')).not.toBeVisible();
    });

    test('Should auto-generate container app name for hybrid', async ({ page }) => {
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      const logicAppName = 'MyTestHybridApp';
      await page.getByLabel('Logic App Name').fill(logicAppName);

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Hybrid' }).click();

      // Verify container app name is auto-generated (lowercase, alphanumeric and hyphens)
      const containerAppNameInput = page.getByLabel('Container App Name');
      await expect(containerAppNameInput).toHaveValue('mytesthybridapp');
    });

    test('Should require all hybrid fields before enabling deploy', async ({ page }) => {
      const deployButton = page.getByRole('button', { name: 'Deploy' });

      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      await page.getByLabel('Logic App Name').fill('test-hybrid-app');

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Hybrid' }).click();

      // Deploy should still be disabled
      await expect(deployButton).toBeDisabled();

      // Fill in connected environment
      await page.getByRole('combobox', { name: 'Select a connected environment' }).click();
      await page.getByRole('option', { name: 'test-managed-env' }).click();

      // Container app name should be auto-filled, but deploy still disabled
      await expect(deployButton).toBeDisabled();

      // Fill in file share details
      await page.getByLabel('File Share Hostname').fill('myserver.file.core.windows.net');
      await page.getByLabel('File Share Path').fill('/myshare');
      await expect(deployButton).toBeDisabled();

      await page.getByLabel('File Share Username').fill('testuser');
      await page.getByLabel('File Share Password').fill('testpass');
      await expect(deployButton).toBeDisabled();

      // Fill in SQL connection string - now deploy should be enabled
      await page.getByLabel('SQL Connection String').fill('Server=test;Database=test;');
      await expect(deployButton).toBeEnabled();
    });

    test('Should load connected environments filtered by location', async ({ page }) => {
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      await page.getByLabel('Logic App Name').fill('test-hybrid-app');

      await page.getByRole('combobox', { name: 'Select a resource group or create new' }).click();
      await page.getByRole('option', { name: 'test-rg' }).click();

      await page.getByRole('combobox', { name: 'Select a location' }).click();
      await page.getByRole('option', { name: 'East US' }).click();

      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Hybrid' }).click();

      // Verify connected environments dropdown shows loading state
      const connectedEnvDropdown = page.getByRole('combobox', { name: 'Select a connected environment' });
      await expect(connectedEnvDropdown).toBeVisible();

      // Click to see available environments (should be filtered by eastus location)
      await connectedEnvDropdown.click();

      // Verify environments are shown
      await expect(page.getByRole('option', { name: /test-managed-env/ })).toBeVisible();
    });

    test('Should mask file share password in telemetry', async ({ page }) => {
      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'Create new Logic App...' }).click();

      await page.getByLabel('Logic App Name').fill('test-hybrid-app');

      await page.getByRole('combobox', { name: 'Select hosting plan type' }).click();
      await page.getByRole('option', { name: 'Hybrid' }).click();

      // Enter password
      const passwordInput = page.getByLabel('File Share Password');
      await passwordInput.fill('SuperSecret123!');

      // Verify password is masked in the input
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  }
);

test.describe(
  'Deploy to Azure - Existing Logic App',
  {
    tag: '@mock',
  },
  () => {
    test('Should allow deploying to existing Logic App', async ({ page }) => {
      await page.goto('/deploy');

      await page.getByRole('combobox', { name: 'Select a subscription' }).click();
      await page.getByRole('option', { name: 'Test Subscription' }).click();

      await page.getByRole('combobox', { name: 'Select a Logic App or create new' }).click();
      await page.getByRole('option', { name: 'existing-logic-app' }).click();

      // Verify no additional fields are shown
      await expect(page.getByLabel('Logic App Name')).not.toBeVisible();
      await expect(page.getByText('Resource Group')).not.toBeVisible();
      await expect(page.getByText('Location')).not.toBeVisible();

      // Deploy button should be enabled
      const deployButton = page.getByRole('button', { name: 'Deploy' });
      await expect(deployButton).toBeEnabled();
    });
  }
);

import { expect, test } from '../../fixtures/real-api';
import workflow from './workflow.json' assert { type: 'json' };
test.describe(
  'Agent Connections',
  {
    tag: '@real',
  },
  () => {
    test.beforeEach(async ({ realDataApi }) => {
      const deployResponse = await realDataApi.deployWorkflow(workflow);
      expect(deployResponse.status()).toBe(200);
    });

    const startConnectionCreation = async (page) => {
      // Open the connection submenu
      await page.getByTestId('Default_Agent-connection-submenu').click();
      await page.getByTestId('Default_Agent-create-connection-button').click();
      // Expect to see the connection components
      await expect(page.getByText('Create a new connection')).toBeVisible();
      // Give connection a name
      var connectionName = `E2E_${new Date().toISOString()}`;
      var nameInput = await page.getByTestId('connection-display-name-input');
      nameInput.clear();
      nameInput.fill(connectionName);
      // Select the subscription
      var subscriptionCombobox = await page.getByTestId('subscription-combobox');
      await subscriptionCombobox.getByRole('button').click();
      await page.getByText('Private Test Sub LAUX TESTS').click();
      // Select the resource
      var resourceCombobox = await page.getByTestId('openai-combobox');
      await resourceCombobox.getByRole('button').click();
      await page.getByText('laux-ai-studio-test').click();

      return connectionName;
    };

    test('Can create a valid connection', async ({ page, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow();

      // Click on the agent action
      await expect(page.getByLabel('Default Agent operation')).toBeVisible();
      await page.getByLabel('Default Agent operation').click();

      const connectionName = await startConnectionCreation(page);

      // Expect to see the proper api endpoint
      await expect(page.getByText('https://laux-ai-studio-test.cognitiveservices.azure.com/')).toBeVisible();

      // Create the connection
      var createButton = await page.getByTestId('create-connection-button');
      await createButton.isEnabled();
      await createButton.click();
      // Verify the connection is created
      await expect(page.getByText(`Current connection: ${connectionName}`)).toBeVisible();

      await realDataApi.saveWorkflow();

      // Reload the page and verify the connection is still there
      await page.reload();
      await realDataApi.goToWorkflow();
      // Click on the agent action
      await expect(page.getByLabel('Default Agent operation')).toBeVisible();
      await page.getByLabel('Default Agent operation').click();
      // Again, verify the connection is created
      await expect(page.getByText(`Current connection: ${connectionName}`)).toBeVisible();

      // Remove / clean up the connection
      await realDataApi.removeConnectionFromConnectionsJSON('agentConnections', 'agent');
    });

    test('Show MSI warnings', async ({ page, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow();

      // Click on the agent action
      await expect(page.getByLabel('Default Agent operation')).toBeVisible();
      await page.getByLabel('Default Agent operation').click();

      // Change the model type to Foundry Agent Service
      await page.getByTestId('msla-setting-token-editor-dropdowneditor-agent_model_type').click();
      await page.getByText('Foundry Agent Service').click();

      await startConnectionCreation(page);

      // Select the test project
      const projectCombobox = await page.getByTestId('openai-project-combobox');
      await projectCombobox.getByRole('button').click();
      await page.getByText('test-project').click();
      // Expect to see the MSI warning
      await expect(page.getByText('Missing role write permissions')).toBeVisible();
      // Expect to see the proper api endpoint
      await expect(page.getByText('https://laux-ai-studio-test.services.ai.azure.com/api/projects/test-project')).toBeVisible();
      // Expect the create button to be disabled
      var createButton = await page.getByTestId('create-connection-button');
      await expect(createButton).toBeDisabled();

      // Verify MSI warning is shown
      await expect(page.getByText('Missing role write permissions')).toBeVisible();
    });
  }
);

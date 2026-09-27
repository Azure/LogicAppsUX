import * as assert from 'assert';
import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import * as vscode from 'vscode';

suite('Azure auth warm-up', () => {
  test('creates the VS Code Microsoft auth session used by Azure connector tests', async () => {
    const tenantId = process.env.LA_E2E_CLI_AUTH_WARMUP_TENANT_ID ?? process.env.LA_E2E_CLI_AZURE_TENANT_ID;
    const subscriptionProvider = new VSCodeAzureSubscriptionProvider();
    try {
      const isSignedIn = await subscriptionProvider.signIn(tenantId);

      assert.ok(isSignedIn, 'Expected VS Code to create or return a Microsoft authentication session');

      const message = [
        '[azure-auth-warmup] VS Code Microsoft authentication session is ready.',
        `Tenant scope: ${tenantId || 'default/organizations'}`,
      ].join('\n');

      console.log(message);
      vscode.window.showInformationMessage('Azure auth warm-up completed for the Logic Apps test profile.');
    } finally {
      subscriptionProvider.dispose();
    }
  });
});

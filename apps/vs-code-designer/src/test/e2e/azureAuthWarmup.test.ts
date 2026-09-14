import * as assert from 'assert';
import { getSessionFromVSCode } from '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode';
import * as vscode from 'vscode';

suite('Azure auth warm-up', () => {
  test('creates the VS Code Microsoft auth session used by Azure connector tests', async () => {
    const tenantId = process.env.LA_E2E_CLI_AUTH_WARMUP_TENANT_ID ?? process.env.LA_E2E_CLI_AZURE_TENANT_ID;
    const session = await getSessionFromVSCode(undefined, tenantId, { createIfNone: true });

    assert.ok(session, 'Expected VS Code to create or return a Microsoft authentication session');
    assert.ok(session.accessToken, 'Expected the Microsoft authentication session to include an access token');

    const message = [
      '[azure-auth-warmup] VS Code Microsoft authentication session is ready.',
      `Account: ${session.account.label || session.account.id}`,
      `Tenant scope: ${tenantId || 'default/organizations'}`,
    ].join('\n');

    console.log(message);
    vscode.window.showInformationMessage('Azure auth warm-up completed for the Logic Apps test profile.');
  });
});

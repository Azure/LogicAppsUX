import { isEmptyString } from '@microsoft/logic-apps-shared';
import { localize } from '../../../localize';
import { getWorkspaceLogicAppFolders } from '../workspace';
import { getAzureConnectorDetailsForLocalProject } from '../codeless/common';
import { getParametersJson } from '../codeless/parameter';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { workspace } from 'vscode';
import { ext } from '../../../extensionVariables';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import { getConnectionsAndSettingsToUpdate, getConnectionsJson, saveConnectionReferences } from '../codeless/connection';

/**
 * Verifies the local connection keys for the specified Logic App project, or all Logic App projects in the workspace by default.
 * @param {IActionContext} context - The command context.
 * @param {string} projectPath - The path to the Logic App project. If not provided, all Logic App projects in the workspace will be verified.
 * @returns {Promise<void>} A promise that resolves when the verification is complete.
 */
export async function verifyLocalConnectionKeys(context: IActionContext, projectPath?: string): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    if (!projectPath) {
      const workspaceLogicAppFolders = await getWorkspaceLogicAppFolders(context);
      await Promise.all(workspaceLogicAppFolders.map((projectPath) => verifyLocalConnectionKeys(context, projectPath)));
      return;
    }

    const azureDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);
    try {
      const connectionsJson = await getConnectionsJson(projectPath);
      if (isEmptyString(connectionsJson)) {
        ext.outputChannel.appendLog(localize('noConnectionKeysFound', 'No connection keys found to verify'));
        return;
      }
      const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
      const parametersData = await getParametersJson(projectPath);
      const managedApiConnectionReferences = connectionsData.managedApiConnections;

      if (connectionsData.managedApiConnections && !(Object.keys(managedApiConnectionReferences).length === 0)) {
        const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
          context,
          projectPath,
          managedApiConnectionReferences,
          azureDetails.tenantId,
          azureDetails.workflowManagementBaseUrl,
          parametersData
        );

        await saveConnectionReferences(context, projectPath, connectionsAndSettingsToUpdate);
      }
    } catch (error) {
      const errorMessage = localize(
        'errorVerifyingConnectionKeys',
        'Error while verifying existing managed api connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

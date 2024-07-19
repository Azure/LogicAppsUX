import { isEmptyString } from '@microsoft/logic-apps-shared';
import { localize } from '../../../localize';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getWorkspaceFolder } from '../workspace';
import { getAzureConnectorDetailsForLocalProject } from '../codeless/common';
import { getParametersJson } from '../codeless/parameter';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { workspace } from 'vscode';
import { ext } from '../../../extensionVariables';
import type { AzureConnectorDetails, ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import { getConnectionsAndSettingsToUpdate, getConnectionsJson, saveConnectionReferences } from '../codeless/connection';

export async function verifyLocalConnectionKeys(context: IActionContext): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    let azureDetails: AzureConnectorDetails;

    if (projectPath) {
      azureDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);
      try {
        const connectionsJson = await getConnectionsJson(projectPath);
        if (isEmptyString(connectionsJson)) {
          ext.outputChannel.appendLog(localize('noConnectionKeysFound', 'No connection keys found to verify'));
          return;
        }
        const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
        const parametersData = getParametersJson(projectPath);
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

          await saveConnectionReferences(this.context, projectPath, connectionsAndSettingsToUpdate);
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
}

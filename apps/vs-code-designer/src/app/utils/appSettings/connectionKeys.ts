import { isEmptyString } from '@microsoft/logic-apps-shared';
import { localize } from '../../../localize';
import { getAzureConnectorDetailsForLocalProject } from '../codeless/common';
import { getParametersJson } from '../codeless/parameter';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { workspace } from 'vscode';
import { ext } from '../../../extensionVariables';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import { getConnectionsAndSettingsToUpdate, getConnectionsJson, saveConnectionReferences } from '../codeless/connection';

/**
 * Refreshes the connection keys for the specified Logic App project.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the Logic App project.
 * @returns {Promise<void>} A promise that resolves when the refresh is complete.
 */
export async function refreshConnectionKeys(context: IActionContext, projectPath: string): Promise<void> {
  const refreshConnectionKeysStartTime = Date.now();
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const azureConnectorDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);
    if (!azureConnectorDetails.enabled) {
      ext.outputChannel.appendLog(
        localize('azureConnectorsDisabled', 'Azure connectors are disabled. Skipping connection key refresh.')
      );
      return;
    }

    try {
      const connectionsJson = await getConnectionsJson(projectPath);
      if (isEmptyString(connectionsJson)) {
        ext.outputChannel.appendLog(localize('noConnectionKeysFound', 'No connection keys found.'));
        return;
      }
      const connections: ConnectionsData = JSON.parse(connectionsJson);
      const parametersData = await getParametersJson(projectPath);

      if (connections.managedApiConnections && (Object.keys(connections.managedApiConnections!).length !== 0)) {
        const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
          context,
          projectPath,
          connections.managedApiConnections,
          azureConnectorDetails.tenantId!,
          azureConnectorDetails.workflowManagementBaseUrl!,
          parametersData
        );

        await saveConnectionReferences(context, projectPath, connectionsAndSettingsToUpdate);
      }
    } catch (error) {
      const errorMessage = localize(
        'errorRefreshingConnectionKeys',
        'Error while refreshing existing managed api connections: {0}',
        (error as Error).message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
  context.telemetry.measurements.refreshConnectionKeysDuration = (Date.now() - refreshConnectionKeysStartTime) / 1000;
}

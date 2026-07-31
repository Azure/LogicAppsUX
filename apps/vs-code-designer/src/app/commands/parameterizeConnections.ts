/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getLocalSettingsJson } from '../utils/appSettings/localSettings';
import { getConnectionsJson, saveConnectionReferences } from '../utils/codeless/connection';
import { getParametersJson, saveWorkflowParameter } from '../utils/codeless/parameter';
import { areAllConnectionsParameterized, parameterizeConnection } from '../utils/codeless/parameterizer';
import { getWorkspaceLogicAppFolders } from '../utils/workspace';
import { type IActionContext } from '@microsoft/vscode-azext-utils';
import { workspace } from 'vscode';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';

/**
 * Parameterizes the connections in all Logic Apps projects within the workspace.
 * @param {IActionContext} context - The action context.
 * @returns A promise that resolves when all connections have been parameterized.
 */
export async function parameterizeAllConnections(context: IActionContext): Promise<void> {
  const projectPaths = await getWorkspaceLogicAppFolders();
  context.telemetry.properties.projectPaths = projectPaths.join(';');

  const failedProjectPaths: string[] = [];
  const errorMessages: string[] = [];
  await Promise.all(
    projectPaths.map(async (projectPath) => {
      try {
        await parameterizeProjectConnectionsInternal(context, projectPath);
      } catch (error) {
        failedProjectPaths.push(projectPath);
        errorMessages.push(error instanceof Error ? error.message : String(error));
      }
    })
  );

  if (errorMessages.length > 0) {
    const aggErrorMessage = localize(
      'parameterizeConnectionsFailed',
      'Failed to parameterize connections with the following errors:\n{0}',
      errorMessages.map((error, index) => `Project: ${failedProjectPaths[index]}, Error: ${error}`).join('\n')
    );
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = aggErrorMessage;
    throw new Error(aggErrorMessage);
  }
}

/**
 * Parameterizes the connections in the Logic Apps project.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the Logic App project, or all Logic App projects in the workspace by default.
 * @returns A promise that resolves when the connections have been parameterized.
 */
export async function parameterizeProjectConnections(context: IActionContext, projectPath?: string): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    if (!projectPath) {
      const workspaceLogicAppFolders = await getWorkspaceLogicAppFolders();
      await Promise.all(workspaceLogicAppFolders.map((projectPath) => parameterizeProjectConnections(context, projectPath)));
      return;
    }

    context.telemetry.properties.projectPath = projectPath;
    try {
      await parameterizeProjectConnectionsInternal(context, projectPath);
    } catch (error) {
      const errorMessage = localize(
        'errorParameterizeProjectConnections',
        'Error while parameterizing existing connections for project "{0}": "{1}".',
        projectPath,
        error instanceof Error ? error.message : String(error)
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

async function parameterizeProjectConnectionsInternal(context: IActionContext, projectPath: string): Promise<void> {
  const connectionsJson = await getConnectionsJson(projectPath);
  if (isEmptyString(connectionsJson)) {
    return;
  }
  const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
  const parametersJson = await getParametersJson(projectPath);
  const localSettingsJson = (await getLocalSettingsJson(context, projectPath)) as Record<string, any>;

  if (areAllConnectionsParameterized(connectionsData)) {
    ext.outputChannel.appendLog(localize('connectionsAlreadyParameterized', 'Connections already parameterized for project "{0}".', projectPath));
    return;
  }

  Object.keys(connectionsData).forEach((connectionType) => {
    if (connectionType !== 'serviceProviderConnections') {
      const connectionTypeJson = connectionsData[connectionType];
      Object.keys(connectionTypeJson).forEach((connectionKey) => {
        connectionTypeJson[connectionKey] = parameterizeConnection(
          connectionTypeJson[connectionKey],
          connectionKey,
          parametersJson,
          localSettingsJson.Values
        );
      });
    }
  });
  await saveWorkflowParameter(context, projectPath, parametersJson);
  await saveConnectionReferences(context, projectPath, { connections: connectionsData, settings: localSettingsJson.Values });
  ext.outputChannel.appendLog(localize('connectionsParameterized', 'Successfully parameterized connections for project "{0}".', projectPath));
}

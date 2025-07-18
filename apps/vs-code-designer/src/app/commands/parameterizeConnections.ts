/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { localSettingsFileName, parameterizeConnectionsInProjectLoadSetting } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getLocalSettingsJson } from '../utils/appSettings/localSettings';
import { getConnectionsJson, saveConnectionReferences } from '../utils/codeless/connection';
import { getParametersJson, saveWorkflowParameter } from '../utils/codeless/parameter';
import { areAllConnectionsParameterized, parameterizeConnection } from '../utils/codeless/parameterizer';
import { getGlobalSetting, updateGlobalSetting } from '../utils/vsCodeConfig/settings';
import { getWorkspaceLogicAppFolders } from '../utils/workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import { window, workspace } from 'vscode';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';

/**
 * Prompts the user to parameterize connections at project load.
 * @param {IActionContext} context - The action context.
 * @param {boolean} [showMessage] - A flag indicating whether to show information message to the user.
 * @returns A promise that resolves when the operation is complete.
 */
export async function promptParameterizeConnections(context: IActionContext, showMessage?: boolean): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const message = localize('allowParameterizeConnections', 'Allow parameterization for connections when your project loads?');
    const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);
    let shouldParameterizeConnections = false;
    if (parameterizeConnectionsSetting === null || parameterizeConnectionsSetting === undefined) {
      const result = await window.showInformationMessage(message, DialogResponses.yes, DialogResponses.no, DialogResponses.dontWarnAgain);
      if (result === DialogResponses.yes) {
        await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, true);
        shouldParameterizeConnections = true;
        context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'true';
      } else if (result === DialogResponses.dontWarnAgain) {
        await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, false);
        context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'false';
      }
    } else if (parameterizeConnectionsSetting) {
      shouldParameterizeConnections = true;
    }

    if (shouldParameterizeConnections) {
      const projectPaths = await getWorkspaceLogicAppFolders();
      await Promise.all(projectPaths.map((projectPath) => parameterizeConnections(context, projectPath, showMessage)));
    }
  }
}

/**
 * Parameterizes the connections in the Logic Apps project.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the Logic App project, or all Logic App projects in the workspace by default.
 * @param {boolean} showMessage - A flag indicating whether to show information message to the user.
 * @returns A promise that resolves when the connections have been parameterized.
 */
export async function parameterizeConnections(context: IActionContext, projectPath?: string, showMessage = true): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    if (!projectPath) {
      const workspaceLogicAppFolders = await getWorkspaceLogicAppFolders();
      await Promise.all(workspaceLogicAppFolders.map((projectPath) => parameterizeConnections(context, projectPath)));
      return;
    }

    try {
      const connectionsJson = await getConnectionsJson(projectPath);
      if (isEmptyString(connectionsJson)) {
        return;
      }
      const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
      const parametersJson = await getParametersJson(projectPath);
      const localSettingsJson = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName))) as Record<string, any>;

      if (areAllConnectionsParameterized(connectionsData)) {
        if (showMessage) {
          window.showInformationMessage(localize('connectionsAlreadyParameterized', 'Connections are already parameterized.'));
        }
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
      window.showInformationMessage(localize('connectionsParameterized', 'Successfully parameterized connections.'));
    } catch (error) {
      const errorMessage = localize(
        'errorParameterizeConnections',
        'Error while parameterizing existing connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

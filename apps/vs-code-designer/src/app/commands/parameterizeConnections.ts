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
import { isConnectionsParameterized, parameterizeConnection } from '../utils/codeless/parameterizer';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import { getGlobalSetting, updateGlobalSetting } from '../utils/vsCodeConfig/settings';
import { getWorkspaceFolder } from '../utils/workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import { window, workspace } from 'vscode';
import { type ConnectionsData } from '@microsoft/vscode-extension-logic-apps';

/**
 * Prompts the user to parameterize connections at project load.
 * @param {IActionContext} context - The action context.
 * @returns A promise that resolves when the operation is complete.
 */
export async function promptParameterizeConnections(context: IActionContext): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    if (projectPath) {
      const message = localize('allowParameterizeConnections', 'Allow parameterization for connections when your project loads.');
      const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

      if (parameterizeConnectionsSetting === null) {
        const result = await window.showInformationMessage(message, DialogResponses.yes, DialogResponses.no, DialogResponses.dontWarnAgain);
        if (result === DialogResponses.yes) {
          await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, true);
          context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'true';
          parameterizeConnections(context);
        } else if (result === DialogResponses.dontWarnAgain) {
          await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, false);
          context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'false';
        }
      } else if (parameterizeConnectionsSetting) {
        await parameterizeConnections(context);
      }
    }
  }
}

/**
 * Parameterizes the connections in the Logic Apps project.
 * @param {IActionContext} context - The action context.
 * @returns A promise that resolves when the connections have been parameterized.
 */
export async function parameterizeConnections(context: IActionContext): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    if (projectPath) {
      try {
        const connectionsJson = await getConnectionsJson(projectPath);
        if (isEmptyString(connectionsJson)) {
          return;
        }
        const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
        const parametersJson = await getParametersJson(projectPath);
        const localSettingsJson = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName))) as Record<
          string,
          any
        >;

        if (isConnectionsParameterized(connectionsData)) {
          window.showInformationMessage(localize('connectionsAlreadyParameterized', 'Connections are already parameterized.'));
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
        window.showInformationMessage(localize('finishedParameterizingConnections', 'Finished parameterizing connections.'));
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
}

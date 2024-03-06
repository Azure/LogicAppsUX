/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, parameterizeConnectionsInProjectLoadSetting } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getLocalSettingsJson } from '../utils/appSettings/localSettings';
import { getConnectionsJson, saveConnectionReferences } from '../utils/codeless/connection';
import { getParametersJson, saveWorkflowParameter } from '../utils/codeless/parameter';
import { parameterizeConnection } from '../utils/codeless/parameterizer';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import { getGlobalSetting, updateGlobalSetting } from '../utils/vsCodeConfig/settings';
import { getWorkspaceFolder } from '../utils/workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import { type ConnectionsData } from '@microsoft/vscode-extension';
import * as path from 'path';
import { window, workspace } from 'vscode';

/**
 * Prompts the user to parameterize connections at project load.
 *
 * @param {IActionContext} context - The action context.
 * @returns A promise that resolves when the operation is complete.
 */
export async function promptParameterizeConnections(context: IActionContext): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    if (projectPath) {
      const message = localize('allowParameterizeConnections', 'Allow connections to be parameterized at project load.');
      const confirm = { title: localize('yesRecommended', 'Yes (Recommended)') };
      const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

      if (parameterizeConnectionsSetting === null) {
        const result = await window.showInformationMessage(message, confirm, DialogResponses.no, DialogResponses.dontWarnAgain);
        if (result === confirm) {
          await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, true);
          context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'true';
          parameterizeConnections(context);
        } else if (result === DialogResponses.dontWarnAgain) {
          await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, false);
          context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'false';
        }
      } else if (parameterizeConnectionsSetting) {
        parameterizeConnections(context);
      }
    }
  }
}

export async function parameterizeConnections(context: IActionContext): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    if (projectPath) {
      try {
        const connectionsJson: ConnectionsData = JSON.parse(await getConnectionsJson(projectPath));
        const parametersJson = await getParametersJson(projectPath);
        const localSettingsJson = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName))) as Record<
          string,
          any
        >;

        Object.keys(connectionsJson).forEach((connectionType) => {
          if (connectionType !== 'serviceProviderConnections') {
            const connectionTypeJson = connectionsJson[connectionType];
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
        await saveConnectionReferences(context, projectPath, { connections: connectionsJson, settings: localSettingsJson.Values });
        window.showInformationMessage(localize('finishedParameterizingConnections', 'Finished parameterizing existing connections.'));
      } catch (error) {
        const errorMessage = localize(
          'errorParameterizeConnections',
          'Error during while parameterizing exiting connections: {0}',
          error.message ?? error
        );
        ext.outputChannel.appendLog(errorMessage);
        context.telemetry.properties.error = errorMessage;
        throw new Error(errorMessage);
      }
    }
  }
}

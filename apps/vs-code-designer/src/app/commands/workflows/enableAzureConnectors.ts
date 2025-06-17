/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, workflowSubscriptionIdKey } from '../../../../src/constants';
import { localize } from '../../../localize';
import type { IAzureConnectorsContext } from '../../commands/workflows/azureConnectorWizard';
import { createAzureWizard } from '../../commands/workflows/azureConnectorWizard';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import type { AzureWizard, IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';
import { getLogicAppProjectRoot } from '../../utils/codeless/connection';
import { getWorkspaceFolder } from '../../utils/workspace';
import { isString } from '@microsoft/logic-apps-shared';

/**
 * Enables Azure connectors for the project containing workflow node.
 * @param {IActionContext} context - The action context for the command.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node.
 */
export async function enableAzureConnectors(context: IActionContext, node: vscode.Uri | undefined): Promise<void> {
  const projectRoot = node !== undefined ? await getLogicAppProjectRoot(context, node.fsPath) : await getWorkspaceFolder(context);
  const projectPath = isString(projectRoot) ? projectRoot : projectRoot.uri.fsPath;
  const localSettingsFilePath: string = path.join(projectPath, localSettingsFileName);
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsFilePath);
  const subscriptionId: string = localSettings.Values[workflowSubscriptionIdKey];

  if (subscriptionId === undefined || subscriptionId === '') {
    const connectorsContext: IAzureConnectorsContext = context as IAzureConnectorsContext;
    const wizard: AzureWizard<IAzureConnectorsContext> = createAzureWizard(connectorsContext, projectPath);
    await wizard.prompt();
    await wizard.execute();
    if (connectorsContext.enabled) {
      vscode.window.showInformationMessage(
        localize(
          'logicapp.azureConnectorsEnabledForProject',
          'Azure connectors are enabled for the project. Reload the designer panel to start using the connectors.'
        )
      );
    }
  } else {
    await vscode.window.showInformationMessage(
      localize('logicapp.azureConnectorsEnabledForWorkflow', 'Azure connectors are enabled for the workflow.')
    );
  }
}

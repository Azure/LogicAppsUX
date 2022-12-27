/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionVersionKey, workerRuntimeKey } from '../../../constants';
import { localize } from '../../../localize';
import type { SlotTreeItemBase } from '../../tree/slotsTree/SlotTreeItemBase';
import { verifyDeploymentResourceGroup } from '../../utils/codeless/common';
import { tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getFunctionsWorkerRuntime } from '../../utils/vsCodeConfig/settings';
import type { StringDictionary } from '@azure/arm-appservice';
import type { SiteClient } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension';
import type { MessageItem } from 'vscode';

export async function verifyAppSettings(
  context: IActionContext,
  node: SlotTreeItemBase,
  version: FuncVersion,
  language: ProjectLanguage,
  originalDeployFsPath: string,
  isNewFunctionApp: boolean
): Promise<void> {
  const client = await node.site.createClient(context);
  const appSettings: StringDictionary = await client.listApplicationSettings();
  if (appSettings.properties) {
    await verifyVersionAndLanguage(context, client.fullName, version, language, appSettings.properties);

    if (!isNewFunctionApp) {
      await verifyConnectionResourceGroup(context, node, originalDeployFsPath);
    }

    const updateAppSettings: boolean = await verifyWebContentSettings(node, context, appSettings.properties);
    if (updateAppSettings) {
      await client.updateApplicationSettings(appSettings);
      // if the user cancels the deployment, the app settings node doesn't reflect the updated settings
      await node.configurationsTreeItem.appSettingsTreeItem.refresh(context);
    }
  }
}

export async function verifyVersionAndLanguage(
  context: IActionContext,
  siteName: string,
  localVersion: FuncVersion,
  localLanguage: ProjectLanguage,
  remoteProperties: { [propertyName: string]: string }
): Promise<void> {
  const rawAzureVersion: string = remoteProperties[extensionVersionKey];
  context.telemetry.properties.remoteVersion = rawAzureVersion;
  const azureVersion: FuncVersion | undefined = tryParseFuncVersion(rawAzureVersion);

  const azureWorkerRuntime: string | undefined = remoteProperties[workerRuntimeKey];
  context.telemetry.properties.remoteRuntime = azureWorkerRuntime;
  const localWorkerRuntime: string | undefined = getFunctionsWorkerRuntime(localLanguage);
  if (azureWorkerRuntime != 'node' && azureWorkerRuntime != 'dotnet') {
    throw new Error(
      localize(
        'incompatibleRuntime',
        'The remote runtime "{0}" for logic app "{1}" must be node or dotnet.',
        azureWorkerRuntime,
        siteName,
        localWorkerRuntime
      )
    );
  }

  if (!!rawAzureVersion && azureVersion !== localVersion) {
    const message: string = localize(
      'incompatibleVersion',
      'The remote version "{0}" for logic app "{1}" does not match your local version "{2}".',
      rawAzureVersion,
      siteName,
      localVersion
    );
    const deployAnyway: MessageItem = { title: localize('deployAnyway', 'Deploy Anyway') };
    const learnMoreLink = 'https://aka.ms/azFuncRuntime';
    context.telemetry.properties.cancelStep = 'incompatibleVersion';
    // No need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(message, { modal: true, learnMoreLink }, deployAnyway);
    context.telemetry.properties.cancelStep = undefined;
  }
}

/**
 * We need this check due to this issue: https://github.com/Microsoft/vscode-azurefunctions/issues/625
 * Only applies to Linux Consumption apps
 */
async function verifyWebContentSettings(
  node: SlotTreeItemBase,
  context: IActionContext,
  remoteProperties: { [propertyName: string]: string }
): Promise<boolean> {
  const isConsumption: boolean = await node.getIsConsumption(context);
  const client: SiteClient = await node.site.createClient(context);
  if (client.isLinux && isConsumption) {
    const WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING';
    const WEBSITE_CONTENTSHARE = 'WEBSITE_CONTENTSHARE';
    if (remoteProperties[WEBSITE_CONTENTAZUREFILECONNECTIONSTRING] || remoteProperties[WEBSITE_CONTENTSHARE]) {
      context.telemetry.properties.webContentSettingsRemoved = 'false';
      await context.ui.showWarningMessage(
        localize(
          'notConfiguredForDeploy',
          'The selected app is not configured for deployment through VS Code. Remove app settings "{0}" and "{1}"?',
          WEBSITE_CONTENTAZUREFILECONNECTIONSTRING,
          WEBSITE_CONTENTSHARE
        ),
        { modal: true },
        DialogResponses.yes,
        DialogResponses.cancel
      );
      delete remoteProperties[WEBSITE_CONTENTAZUREFILECONNECTIONSTRING];
      delete remoteProperties[WEBSITE_CONTENTSHARE];
      context.telemetry.properties.webContentSettingsRemoved = 'true';
      return true;
    }
  }

  return false;
}

export async function verifyConnectionResourceGroup(
  context: IActionContext,
  node: SlotTreeItemBase,
  originalDeployFsPath: string
): Promise<void> {
  const workflowResourceGroupRemote = node.site.resourceGroup;
  await verifyDeploymentResourceGroup(context, workflowResourceGroupRemote, originalDeployFsPath);
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionVersionKey, workerRuntimeKey } from '../../../constants';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { verifyDeploymentResourceGroup } from '../../utils/codeless/common';
import { tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getFunctionsWorkerRuntime } from '../../utils/vsCodeConfig/settings';
import type { StringDictionary } from '@azure/arm-appservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { MessageItem } from 'vscode';

/**
 * Verifies remote app settings.
 * @param {IActionContext} context - Command context.
 * @param {SlotTreeItem} node - Logic app node structure.
 * @param {FuncVersion} version - Function core tools local version.
 * @param {ProjectLanguage} language - Project local language.
 * @param {string} originalDeployFsPath - Workflow path to deploy.
 * @param {boolean} isNewLogicApp - Determines if it is a new logic app.
 */
export async function verifyAppSettings(
  context: IActionContext,
  node: SlotTreeItem,
  version: FuncVersion,
  language: ProjectLanguage,
  originalDeployFsPath: string,
  isNewLogicApp: boolean
): Promise<void> {
  const client = await node.site.createClient(context);
  const appSettings: StringDictionary = await client.listApplicationSettings();
  if (appSettings.properties) {
    await verifyVersionAndLanguage(context, client.fullName, version, language, appSettings.properties);

    if (!isNewLogicApp) {
      await verifyConnectionResourceGroup(context, node, originalDeployFsPath);
    }
  }
}

/**
 * Verifies azure core tools version and runtime language.
 * @param {IActionContext} context - Command context.
 * @param {string} siteName - Remote logic app name.
 * @param {FuncVersion} localVersion - Function core tools local version.
 * @param {ProjectLanguage} localLanguage - Project local language.
 * @param {Record<string,string>} remoteProperties - List of remote logic app local.settings properties.
 */
export async function verifyVersionAndLanguage(
  context: IActionContext,
  siteName: string,
  localVersion: FuncVersion,
  localLanguage: ProjectLanguage,
  remoteProperties: Record<string, string>
): Promise<void> {
  const rawAzureVersion: string = remoteProperties[extensionVersionKey];
  context.telemetry.properties.remoteVersion = rawAzureVersion;
  const azureVersion: FuncVersion | undefined = tryParseFuncVersion(rawAzureVersion);

  const azureWorkerRuntime: string | undefined = remoteProperties[workerRuntimeKey];
  context.telemetry.properties.remoteRuntime = azureWorkerRuntime;
  const localWorkerRuntime: WorkerRuntime | undefined = getFunctionsWorkerRuntime(localLanguage);

  if (
    azureWorkerRuntime !== WorkerRuntime.Node &&
    azureWorkerRuntime !== WorkerRuntime.Dotnet &&
    azureWorkerRuntime !== WorkerRuntime.DotnetIsolated
  ) {
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
 * Gets remote resource group and verifies deployment of it.
 * @param {IActionContext} context - Command context.
 * @param {SlotTreeItem} node - Logic app node structure.
 * @param {string} originalDeployFsPath - Workflow path to deploy.
 */
export async function verifyConnectionResourceGroup(
  context: IActionContext,
  node: SlotTreeItem,
  originalDeployFsPath: string
): Promise<void> {
  const workflowResourceGroupRemote = node.site.resourceGroup;
  await verifyDeploymentResourceGroup(context, workflowResourceGroupRemote, originalDeployFsPath);
}

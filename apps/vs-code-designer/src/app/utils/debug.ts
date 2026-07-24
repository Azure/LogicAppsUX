/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { DebugConfigurationProvider } from 'vscode';
import { debugSymbolDll, extensionBundleId, extensionCommand } from '../../constants';
import * as vscode from 'vscode';
import * as path from 'path';
import { getBundleVersionNumber, getExtensionBundleFolder } from './bundleFeed';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';

export const logicAppDebugConfigProvider: DebugConfigurationProvider = {
  resolveDebugConfiguration: async (folder, debugConfig) => {
    const logDebugAttach = (message: string) => {
      ext.outputChannel?.appendLog(message);
    };

    if (!debugConfig.funcRuntime) {
      debugConfig.funcRuntime = 'coreclr';
    }

    const maxRetries = 3;
    const delayMs = 5000;
    const debugConfigName = debugConfig.name ?? folder?.name ?? 'logic app';
    logDebugAttach(
      localize(
        'resolveDebugConfigurationStart',
        'Resolving logic app debug configuration "{0}" for workspace "{1}". funcRuntime={2}, customCodeRuntime={3}.',
        debugConfigName,
        folder?.uri.fsPath ?? 'unknown workspace',
        debugConfig.funcRuntime,
        debugConfig.customCodeRuntime ?? 'none'
      )
    );

    for (let i = 0; i < maxRetries; i++) {
      try {
        await vscode.commands.executeCommand(extensionCommand.debugLogicApp, debugConfig, folder);
        logDebugAttach(
          localize(
            'resolveDebugConfigurationSucceeded',
            'Logic app debug configuration "{0}" resolved on attempt {1}/{2}.',
            debugConfigName,
            i + 1,
            maxRetries
          )
        );
        break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logDebugAttach(
          localize(
            'resolveDebugConfigurationFailed',
            'Logic app debug configuration "{0}" failed on attempt {1}/{2}. Error: {3}',
            debugConfigName,
            i + 1,
            maxRetries,
            errorMessage
          )
        );
        if (i === maxRetries - 1) {
          throw error;
        }

        logDebugAttach(
          localize('resolveDebugConfigurationRetry', 'Retrying logic app debug configuration "{0}" in {1} ms.', debugConfigName, delayMs)
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return undefined;
  },
};

export async function getDebugSymbolDll(): Promise<string> {
  const bundleFolderRoot = await getExtensionBundleFolder();
  const bundleFolder = path.join(bundleFolderRoot, extensionBundleId);
  const bundleVersionNumber = await getBundleVersionNumber();

  return path.join(bundleFolder, bundleVersionNumber, 'bin', debugSymbolDll);
}

/**
 * Determines whether the given project type and target framework use the modern
 * LogicAppFolderToPublish csproj property (as opposed to the legacy LogicAppFolder).
 * Modern .NET frameworks (Net8, Net10, etc.) use LogicAppFolderToPublish for custom code projects.
 */
export function usesPublishFolderProperty(projectType: ProjectType, targetFramework: TargetFramework): boolean {
  return projectType === ProjectType.customCode && targetFramework !== TargetFramework.NetFx;
}

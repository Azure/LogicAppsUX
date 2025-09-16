/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FuncVersion, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { DebugConfiguration } from 'vscode';
import { debugSymbolDll, EXTENSION_BUNDLE_VERSION, extensionBundleId, extensionCommand } from '../../constants';
import * as path from 'path';
import { getExtensionBundleFolder } from './bundleFeed';

export async function getDebugSymbolDll(): Promise<string> {
  const bundleFolderRoot = await getExtensionBundleFolder();
  const bundleFolder = path.join(bundleFolderRoot, extensionBundleId);

  return path.join(bundleFolder, EXTENSION_BUNDLE_VERSION, 'bin', debugSymbolDll);
}

/**
 * Generates a debug configuration for a Logic App based on the function version and optional custom code framework.
 * @param version - The Azure Functions runtime version (v1, v2, v3, or v4)
 * @param logicAppName - The name of the Logic App to debug
 * @param customCodeTargetFramework - Optional target framework for custom code (.NET 8 or .NET Framework)
 *
 * @returns A DebugConfiguration object with either:
 * - Launch configuration for Logic Apps with custom code, including both function and custom code runtime settings
 * - Attach configuration for standard Logic Apps, allowing process selection for debugging
 */
export const getDebugConfiguration = (
  version: FuncVersion,
  logicAppName: string,
  customCodeTargetFramework?: TargetFramework
): DebugConfiguration => {
  if (customCodeTargetFramework) {
    return {
      name: `Run/Debug logic app with local function ${logicAppName}`,
      type: 'logicapp',
      request: 'launch',
      funcRuntime: version === FuncVersion.v1 ? 'clr' : 'coreclr',
      customCodeRuntime: customCodeTargetFramework === TargetFramework.Net8 ? 'coreclr' : 'clr',
      isCodeless: true,
    };
  }

  return {
    name: `Run/Debug logic app ${logicAppName}`,
    type: version === FuncVersion.v1 ? 'clr' : 'coreclr',
    request: 'attach',
    processId: `\${command:${extensionCommand.pickProcess}}`,
  };
};

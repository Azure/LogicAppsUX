/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FuncVersion, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { DebugConfiguration } from 'vscode';
import { debugSymbolDll, extensionBundleId, extensionCommand } from '../../constants';

import * as path from 'path';
import { getBundleVersionNumber, getExtensionBundleFolder } from './bundleFeed';

export async function getDebugSymbolDll(): Promise<string> {
  const bundleFolderRoot = await getExtensionBundleFolder();
  const bundleFolder = path.join(bundleFolderRoot, extensionBundleId);
  const bundleVersionNumber = await getBundleVersionNumber();

  return path.join(bundleFolder, bundleVersionNumber, 'bin', debugSymbolDll);
}

/**
 * Generates a debug configuration for a Logic App based on the function version and optional custom code framework.
 * @param version - The Azure Functions runtime version (v1, v2, v3, or v4)
 * @param logicAppName - The name of the Logic App to debug
 * @param customCodeTargetFramework - Optional target framework for custom code (.NET 8 or .NET Framework).
 *   When provided, returns a launch configuration with `type: 'logicapp'`.
 * @param isCodeless - Whether the project uses codeless (JSON) workflow definitions. Defaults to `true`.
 *   - `true` (custom code): includes `customCodeRuntime` for attaching a second debugger to the .NET host.
 *   - `false` (codeful): omits `customCodeRuntime` since the workflow IS the compiled code.
 *
 * @returns A DebugConfiguration object with either:
 * - Launch configuration for Logic Apps with custom code (isCodeless=true), including both function and custom code runtime settings
 * - Launch configuration for codeful Logic Apps (isCodeless=false), with function runtime only
 * - Attach configuration for standard Logic Apps (no customCodeTargetFramework), allowing process selection for debugging
 */
export const getDebugConfiguration = (
  version: FuncVersion,
  logicAppName: string,
  customCodeTargetFramework?: TargetFramework,
  isCodeless = true
): DebugConfiguration => {
  if (customCodeTargetFramework) {
    const config: DebugConfiguration = {
      name: isCodeless ? `Run/Debug logic app with local function ${logicAppName}` : `Run/Debug logic app ${logicAppName}`,
      type: 'logicapp',
      request: 'launch',
      funcRuntime: version === FuncVersion.v1 ? 'clr' : 'coreclr',
      isCodeless,
    };

    if (isCodeless) {
      config.customCodeRuntime = customCodeTargetFramework === TargetFramework.Net8 ? 'coreclr' : 'clr';
    }

    return config;
  }

  return {
    name: `Run/Debug logic app ${logicAppName}`,
    type: version === FuncVersion.v1 ? 'clr' : 'coreclr',
    request: 'attach',
    processId: `\${command:${extensionCommand.pickProcess}}`,
  };
};

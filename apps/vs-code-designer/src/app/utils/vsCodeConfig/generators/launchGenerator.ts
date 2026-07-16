/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { VSCodeProjectConfig } from './types';
import { extensionCommand, launchVersion } from '../../../../constants';
import { FuncVersion, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { getDotnetRuntimeFromFramework, getDotnetRuntimeFromFunc } from '../../dotnet/dotnet';
import type { DebugConfiguration } from 'vscode';

export interface LaunchJsonContent {
  version: string;
  configurations: DebugConfiguration[];
}

/**
 * Generates the canonical launch.json content for a Logic App project.
 */
export function generateLaunchJson(config: VSCodeProjectConfig): LaunchJsonContent {
  const logicAppName = config.logicAppName ?? 'logic app';
  return {
    version: launchVersion,
    configurations: [generateDebugConfiguration(config, logicAppName)],
  };
}

/**
 * Generates a single debug configuration based on the project type.
 */
function generateDebugConfiguration(config: VSCodeProjectConfig, logicAppName: string): DebugConfiguration {
  const { projectType, customCodeTargetFramework, funcVersion } = config;
  const version = funcVersion ?? FuncVersion.v4;

  if (projectType === ProjectType.codeful) {
    return {
      name: `Run/Debug logic app ${logicAppName}`,
      type: 'logicapp',
      request: 'launch',
      funcRuntime: getDotnetRuntimeFromFunc(version),
      isCodeless: false,
    };
  }

  if (customCodeTargetFramework) {
    return {
      name: `Run/Debug logic app with local function ${logicAppName}`,
      type: 'logicapp',
      request: 'launch',
      funcRuntime: getDotnetRuntimeFromFunc(version),
      customCodeRuntime: getDotnetRuntimeFromFramework(customCodeTargetFramework),
      isCodeless: true,
    };
  }

  return {
    name: `Run/Debug logic app ${logicAppName}`,
    type: getDotnetRuntimeFromFunc(version),
    request: 'attach',
    processId: `\${command:${extensionCommand.pickProcess}}`,
  };
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { TasksJsonContent, VSCodeProjectConfig } from './types';
import { getFuncHostTaskEnv } from '../../codeless/funcHostTaskEnv';
import { dotnetPublishTaskLabel, extensionCommand, func, funcWatchProblemMatcher, hostStartCommand } from '../../../../constants';
import { ProjectType, ProjectPackageType } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';

const TASKS_VERSION = '2.0.0';
const FUNC_BINARY_PATH = '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}';
const DOTNET_BINARY_PATH = '${config:azureLogicAppsStandard.dotnetBinaryPath}';
const COMMON_DOTNET_ARGS = ['/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
const RELEASE_ARGS = ['--configuration', 'Release'];

/**
 * Generates the canonical tasks.json content for a Logic App project.
 */
export function generateTasksJson(config: VSCodeProjectConfig): TasksJsonContent {
  const { projectType, projectPackageType } = config;

  if (projectType === ProjectType.codeful) {
    return generateCodefulTasksJson(config);
  }

  if (projectPackageType === ProjectPackageType.Nuget) {
    return generateNugetTasksJson(config);
  }

  return generateCodelessTasksJson(config);
}

function generateCodefulTasksJson(config: VSCodeProjectConfig): TasksJsonContent {
  return {
    version: TASKS_VERSION,
    tasks: [...getDotnetBuildTasks(), getFuncHostStartTask(config, { dependsOn: 'build' })],
  };
}

function generateNugetTasksJson(config: VSCodeProjectConfig): TasksJsonContent {
  return {
    version: TASKS_VERSION,
    tasks: [getDebugSymbolsTask(), ...getDotnetBuildTasks(), getFuncHostStartTask(config, { dependsOn: 'build' })],
    inputs: [getDebugSymbolDllInput()],
  };
}

function generateCodelessTasksJson(config: VSCodeProjectConfig): TasksJsonContent {
  return {
    version: TASKS_VERSION,
    tasks: [getDebugSymbolsTask(), getFuncHostStartTask(config)],
    inputs: [getDebugSymbolDllInput()],
  };
}

function getDotnetBuildTasks() {
  return [
    {
      label: 'clean',
      command: DOTNET_BINARY_PATH,
      args: ['clean', ...COMMON_DOTNET_ARGS],
      type: 'process',
      problemMatcher: '$msCompile',
    },
    {
      label: 'build',
      command: DOTNET_BINARY_PATH,
      args: ['build', ...COMMON_DOTNET_ARGS],
      type: 'process',
      dependsOn: 'clean',
      group: {
        kind: 'build',
        isDefault: true,
      },
      problemMatcher: '$msCompile',
    },
    {
      label: 'clean release',
      command: DOTNET_BINARY_PATH,
      args: ['clean', ...RELEASE_ARGS, ...COMMON_DOTNET_ARGS],
      type: 'process',
      problemMatcher: '$msCompile',
    },
    {
      label: dotnetPublishTaskLabel,
      command: DOTNET_BINARY_PATH,
      args: ['publish', ...RELEASE_ARGS, ...COMMON_DOTNET_ARGS],
      type: 'process',
      dependsOn: 'clean release',
      problemMatcher: '$msCompile',
    },
  ];
}

function getDebugSymbolsTask() {
  return {
    label: 'generateDebugSymbols',
    command: DOTNET_BINARY_PATH,
    args: ['${input:getDebugSymbolDll}'],
    type: 'process',
    problemMatcher: '$msCompile',
  };
}

function getFuncHostStartTask(config: VSCodeProjectConfig, options?: { dependsOn?: string }) {
  const { hasFuncBinaries, isDevContainer, targetFramework, projectType, projectPackageType } = config;
  const isDotnet = projectType === ProjectType.codeful || projectPackageType === ProjectPackageType.Nuget;
  const debugSubpath = isDotnet && targetFramework ? path.posix.join('bin', 'Debug', targetFramework) : undefined;

  const envOptions = hasFuncBinaries && !isDevContainer ? getFuncHostTaskEnv(debugSubpath ? { cwd: debugSubpath } : undefined) : {};

  const task: Record<string, unknown> = {
    label: 'func: host start',
    type: hasFuncBinaries ? 'shell' : func,
    command: hasFuncBinaries ? FUNC_BINARY_PATH : hostStartCommand,
    args: hasFuncBinaries ? ['host', 'start'] : undefined,
    ...envOptions,
    problemMatcher: funcWatchProblemMatcher,
    isBackground: true,
  };

  if (options?.dependsOn) {
    task.dependsOn = options.dependsOn;
  }

  if (!isDotnet) {
    task.group = { kind: 'build', isDefault: true };
  }

  return task;
}

function getDebugSymbolDllInput() {
  return {
    id: 'getDebugSymbolDll',
    type: 'command',
    command: extensionCommand.getDebugSymbolDll,
  };
}

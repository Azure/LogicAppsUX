/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binariesExist } from '../../../app/utils/binaries';
import { extensionCommand, func, funcDependencyName, funcWatchProblemMatcher, hostStartCommand } from '../../../constants';
import { ScriptInitVSCodeStep } from './ScriptInitVSCodeStep';
import type { IProjectWizardContext, ITaskInputs, ISettingToAdd } from '@microsoft/vscode-extension';
import type { TaskDefinition } from 'vscode';

export class WorkflowInitVSCodeStep extends ScriptInitVSCodeStep {
  protected async executeCore(context: IProjectWizardContext): Promise<void> {
    await super.executeCore(context);
  }

  protected getTasks(): TaskDefinition[] {
    const funcBinariesExist = binariesExist(funcDependencyName);
    const binariesOptions = funcBinariesExist
      ? {
          options: {
            env: {
              PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\NodeJs;${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\DotNetSDK;$env:PATH',
            },
          },
        }
      : {};
    return [
      {
        label: 'generateDebugSymbols',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['${input:getDebugSymbolDll}'],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        type: funcBinariesExist ? 'shell' : func,
        command: funcBinariesExist ? '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}' : hostStartCommand,
        args: funcBinariesExist ? ['host', 'start'] : undefined,
        ...binariesOptions,
        problemMatcher: funcWatchProblemMatcher,
        isBackground: true,
        label: 'func: host start',
        group: {
          kind: 'build',
          isDefault: true,
        },
      },
    ];
  }

  protected getTaskInputs(): ITaskInputs[] {
    return [
      {
        id: 'getDebugSymbolDll',
        type: 'command',
        command: extensionCommand.getDebugSymbolDll,
      },
    ];
  }

  protected getWorkspaceSettings(): ISettingToAdd[] {
    return [{ prefix: 'azureFunctions', key: 'suppressProject', value: true }];
  }
}

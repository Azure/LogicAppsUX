/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binariesExistSync } from '../../utils/binaries';
import { getFuncHostTaskEnv } from '../../utils/codeless/funcHostTaskEnv';
import { extensionCommand, func, funcDependencyName, funcWatchProblemMatcher, hostStartCommand } from '../../../constants';
import { InitProjectStepBase } from './initProjectStepBase';
import type { IProjectWizardContext, ITaskInputs, ISettingToAdd } from '@microsoft/vscode-extension-logic-apps';
import type { TaskDefinition } from 'vscode';

export class InitProjectStep extends InitProjectStepBase {
  protected async executeCore(context: IProjectWizardContext): Promise<void> {
    await this.setDeploySubpath(context, '.');
  }

  protected getTasks(): TaskDefinition[] {
    const funcBinariesExist = binariesExistSync(funcDependencyName);
    const binariesOptions = funcBinariesExist ? getFuncHostTaskEnv() : {};
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

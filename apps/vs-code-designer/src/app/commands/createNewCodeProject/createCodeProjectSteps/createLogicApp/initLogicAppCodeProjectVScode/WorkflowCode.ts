/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, func, funcWatchProblemMatcher, hostStartCommand } from '../../../../../../constants';
import { ScriptInit } from './ScriptInit';
import type { IProjectWizardContext, ITaskInputs, ISettingToAdd } from '@microsoft/vscode-extension';
import type { TaskDefinition } from 'vscode';

export class WorkflowInitCodeProject extends ScriptInit {
  protected async executeCore(context: IProjectWizardContext): Promise<void> {
    await super.executeCore(context);
  }

  protected getTasks(): TaskDefinition[] {
    return [
      {
        label: 'generateDebugSymbols',
        command: 'dotnet',
        args: ['${input:getDebugSymbolDll}'],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        type: func,
        command: hostStartCommand,
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

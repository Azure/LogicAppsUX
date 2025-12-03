/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, funcWatchProblemMatcher } from '../../../constants';
import { InitScriptProjectStep } from './initScriptProjectStep';
import type { ITaskInputs, ISettingToAdd } from '@microsoft/vscode-extension-logic-apps';
import type { TaskDefinition } from 'vscode';

export class InitProjectStep extends InitScriptProjectStep {
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
        type: 'shell',
        command: 'func',
        args: ['host', 'start'],
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

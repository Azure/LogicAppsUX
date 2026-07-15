/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, funcDependencyName } from '../../../../constants';
import { binariesExistSync } from '../../../utils/binaries';
import { generateTasksJson } from '../../../utils/vsCodeConfig/generators';
import { InitCustomCodeProjectStepBase } from './initCustomCodeProjectStepBase';
import type { IProjectWizardContext, ITaskInputs, ISettingToAdd } from '@microsoft/vscode-extension-logic-apps';
import { ProjectType, ProjectPackageType } from '@microsoft/vscode-extension-logic-apps';
import type { TaskDefinition } from 'vscode';

export class InitCustomCodeProjectStep extends InitCustomCodeProjectStepBase {
  protected async executeCore(_context: IProjectWizardContext): Promise<void> {
    // No additional setup needed for custom code projects
  }

  protected getTasks(): TaskDefinition[] {
    const { tasks } = generateTasksJson({
      projectType: ProjectType.customCode,
      projectPackageType: ProjectPackageType.Bundle,
      hasFuncBinaries: binariesExistSync(funcDependencyName),
    });
    return tasks as TaskDefinition[];
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

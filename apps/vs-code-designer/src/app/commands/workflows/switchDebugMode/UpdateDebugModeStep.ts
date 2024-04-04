/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addOrUpdateLocalAppSettings } from '../../../utils/appSettings/localSettings';
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IDebugModeContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';

export class UpdateDebugModeStep extends AzureWizardExecuteStep<IDebugModeContext> {
  public priority = 100;

  public execute(
    context: IDebugModeContext,
    _progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    const { enableDebugMode, projectPath, workflowName } = context;
    return addOrUpdateLocalAppSettings(context, projectPath, {
      [`Workflows.${workflowName}.OperationOptions`]: enableDebugMode ? 'WithStatelessRunHistory' : 'None',
    });
  }

  public shouldExecute(): boolean {
    return true;
  }
}

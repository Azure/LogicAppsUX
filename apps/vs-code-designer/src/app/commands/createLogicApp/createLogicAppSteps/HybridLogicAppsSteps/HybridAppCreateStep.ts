/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';
import { localize } from '../../../../../localize';
import { ext } from '../../../../../extensionVariables';
import { createHybridApp, createLogicAppExtension } from '../../../../utils/codeless/hybridApp';

export class HybridAppCreateStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 120;

  public async execute(context: ILogicAppWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    try {
      const message: string = localize('creatingNewHybridApp', 'Creating hybrid app "{0}"...', context.newSiteName);
      ext.outputChannel.appendLog(message);
      progress.report({ message });
      await createHybridApp(context);
      await createLogicAppExtension(context);
    } catch (error) {
      throw new Error(error);
    }
  }

  public shouldExecute(wizardContext: ILogicAppWizardContext): boolean {
    return !!wizardContext.connectedEnvironment && !!wizardContext.fileShare;
  }
}

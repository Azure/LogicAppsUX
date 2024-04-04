/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ScriptProjectCreateStep } from './ScriptProjectCreateStep';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';

export class WorkflowProjectCreateStep extends ScriptProjectCreateStep {
  public async executeCore(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    await super.executeCore(context, progress);
  }
}

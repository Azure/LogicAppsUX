/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkflowInitVSCodeStep } from './WorkflowInitVSCodeStep';
import type { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { WorkflowProjectType } from '@microsoft/vscode-extension';

export async function addInitVSCodeSteps(
  context: IProjectWizardContext,
  executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[]
): Promise<void> {
  switch (context.workflowProjectType) {
    case WorkflowProjectType.Bundle:
      executeSteps.push(new WorkflowInitVSCodeStep());
      break;
  }
}

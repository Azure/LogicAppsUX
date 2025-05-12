/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { DeploymentScriptType } from '@microsoft/vscode-extension-logic-apps';

export class GenerateDeploymentCenterScriptsStep extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 250;

  /**
   * Executes the step to generate deployment scripts for Azure Deployment Center.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves when the scripts are generated.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    console.log(context);
  }

  /**
   * Determines whether this step should be executed based on the user's input.
   * @param context The context object for the project wizard.
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(context: IProjectWizardContext): boolean {
    return context.deploymentScriptType === DeploymentScriptType.azureDeploymentCenter;
  }
}

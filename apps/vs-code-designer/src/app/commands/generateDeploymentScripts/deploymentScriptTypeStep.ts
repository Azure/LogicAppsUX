/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { DeploymentScriptType } from '@microsoft/vscode-extension-logic-apps';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class DeploymentScriptTypeStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  /**
   * Prompts the user for a deployment script type.
   * @param context - The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder = localize('setDeploymentScriptType', 'Deployment script type');
    const picks: IAzureQuickPickItem<DeploymentScriptType>[] = [
      { label: localize('azureDevOpsPipeline', 'Azure DevOps Pipeline'), data: DeploymentScriptType.azureDevOpsPipeline },
      { label: localize('azureDeploymentCenter', 'Azure Deployment Center'), data: DeploymentScriptType.azureDeploymentCenter },
    ];
    context.deploymentScriptType = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  public shouldPrompt(): boolean {
    return true;
  }
}

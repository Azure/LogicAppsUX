import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';
import * as path from 'path';

export class LogicAppMSIStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public shouldPrompt(): boolean {
    return true;
  }

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'LogicAppMSIStep';
    const placeHolder: string = localize(
      'selectLogicAppUserAssignedManagedIdentity',
      'Select the Logic App User-Assigned Managed Identity to use for deployment'
    );
    const msis = context.logicAppNode.site.rawSite.identity?.userAssignedIdentities;
    if (!msis) {
      throw new Error(
        'No user assigned managed identity found. The Logic App must have a user-assigned managed identity with "Logic App Standard Contributor" role on the deployment resource group.'
      );
    }
    const msiPicks: IAzureQuickPickItem<string>[] = Object.entries(msis).map(([key, value]) => ({
      label: path.basename(key),
      data: value.clientId,
    }));

    context.msiClientId = (await context.ui.showQuickPick(msiPicks, { placeHolder })).data;
  }
}

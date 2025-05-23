import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';
import * as path from 'path';

export class LogicAppUAMIStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    const placeHolder: string = localize(
      'selectLogicAppUserAssignedManagedIdentity',
      'Select the Logic App User-Assigned Managed Identity to use for deployment'
    );
    const uamis = context.logicAppNode.site.rawSite.identity?.userAssignedIdentities;
    if (!uamis) {
      throw new Error(
        localize(
          'noUAMI',
          'No user assigned managed identity found. The Logic App must have a user assigned managed identity with contributor role on the deployment resource group.'
        )
      );
    }
    const uamiPicks: IAzureQuickPickItem<string>[] = Object.entries(uamis).map(([key, value]) => ({
      label: path.basename(key),
      data: value.clientId,
    }));

    context.uamiClientId = (await context.ui.showQuickPick(uamiPicks, { placeHolder })).data;
  }

  public shouldPrompt(): boolean {
    return true;
  }
}

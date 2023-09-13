import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';

export class SetLogicAppType extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const picks: IAzureQuickPickItem<boolean>[] = [
      { label: 'Logic app', data: false },
      { label: 'Logic app with custom code project', data: true },
    ];

    const placeHolder = 'Select a project template for your logic app workspace';
    const selectedType = (await context.ui.showQuickPick(picks, { placeHolder })).data;
    context.isCustomCodeLogicApp = selectedType;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.isCustomCodeLogicApp === undefined;
  }
}

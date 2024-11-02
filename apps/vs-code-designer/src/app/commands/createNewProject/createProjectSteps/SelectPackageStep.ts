import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class SelectPackageStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;
  public supportsDuplicateSteps = false;

  public static async selectPackagePath(context: IActionContext, placeHolder: string): Promise<string> {
    const packagePicks: IAzureQuickPickItem<string | undefined>[] = [];
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
      openLabel: localize('selectPackageFile', 'Select package file'),
      filters: { Packages: ['zip'] },
    };

    packagePicks.push({ label: localize('browse', '$(file-directory) Browse...'), description: '', data: undefined });
    const packageFile: IAzureQuickPickItem<string | undefined> | undefined = await context.ui.showQuickPick(packagePicks, { placeHolder });

    return packageFile && packageFile.data ? packageFile.data : (await context.ui.showOpenDialog(options))[0].fsPath;
  }

  public async prompt(context: IFunctionWizardContext): Promise<void> {
    const placeHolder: string = localize('selectPackage', 'Select the package to import to your new logic app workspace');
    context.packagePath = await SelectPackageStep.selectPackagePath(context, placeHolder);
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.packagePath === undefined;
  }
}

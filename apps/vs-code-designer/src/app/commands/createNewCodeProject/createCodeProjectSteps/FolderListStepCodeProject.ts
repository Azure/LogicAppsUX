import { localize } from '../../../../localize';
import { getContainingWorkspace, selectWorkspaceFolder } from '../../../utils/workspace';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { OpenBehavior } from '@microsoft/vscode-extension';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { window } from 'vscode';

export class FolderListStepCodeProject extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public static setWorkspaceName(context: Partial<IProjectWizardContext>, workspaceName: string): void {
    context.workspaceName = workspaceName;
  }

  public static setProjectPath(context: Partial<IProjectWizardContext>, projectPath: string): void {
    context.projectPath = projectPath;
    context.workspaceFolder = getContainingWorkspace(projectPath);
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || projectPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select the folder that will contain your workflow project');
    const selectedFolder: string = await selectWorkspaceFolder(context, placeHolder);

    const workspaceName: string | undefined = await window.showInputBox({
      prompt: 'Enter a name for your workspace',
      value: '',
    });

    if (!workspaceName) {
      // The user cancelled the input box or didn't provide a name
      return;
    }

    if (workspaceName) {
      FolderListStepCodeProject.setWorkspaceName(context, workspaceName.trim());
    }

    FolderListStepCodeProject.setProjectPath(context, selectedFolder);
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.projectPath;
  }
}

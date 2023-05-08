import { localize } from '../../../../localize';
import { getContainingWorkspace, selectWorkspaceFolder } from '../../../utils/workspace';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { OpenBehavior } from '@microsoft/vscode-extension';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';

export class FolderListStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public static setProjectPath(context: Partial<IProjectWizardContext>, projectPath: string): void {
    console.log('Before setting project path:', context.projectPath);
    context.projectPath = projectPath;
    context.workspaceFolder = getContainingWorkspace(projectPath);
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || projectPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
    console.log('After setting project path:', context.projectPath);
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select the folder that will contain your workflow project');
    console.log('Before setting project path in prompt:', context.projectPath);
    FolderListStep.setProjectPath(context, await selectWorkspaceFolder(context, placeHolder));
    console.log('After setting project path in prompt:', context.projectPath);
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.projectPath;
  }
}

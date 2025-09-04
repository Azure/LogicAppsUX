import { extensionCommand } from '../../constants';
import { localize } from '../../localize';
import { addLocalFuncTelemetry } from '../utils/funcCoreTools/funcVersion';
import { WorkspaceFolderStep } from './createWorkspace/createWorkspaceSteps/workspaceFolderStep';
import { OpenFolderStep } from './createWorkspace/createWorkspaceSteps/openFolderStep';
import { AzureWizard, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import { window } from 'vscode';
import { getWorkspaceFile, getWorkspaceFileInParentDirectory, getWorkspaceFolder, getWorkspaceRoot } from '../utils/workspace';
import { WorkspaceNameStep } from './createWorkspace/createWorkspaceSteps/workspaceNameStep';
import { WorkspaceFileStep } from './createWorkspace/createWorkspaceSteps/workspaceFileStep';
import { isLogicAppProjectInRoot } from '../utils/verifyIsProject';

export async function convertToWorkspace(context: IActionContext): Promise<boolean> {
  const workspaceFolder = await getWorkspaceFolder(context, undefined, true);
  if (await isLogicAppProjectInRoot(workspaceFolder)) {
    addLocalFuncTelemetry(context);

    const wizardContext = context as Partial<IFunctionWizardContext> & IActionContext;
    context.telemetry.properties.isWorkspace = 'false';
    wizardContext.workspaceFilePath = (await getWorkspaceFile(wizardContext)) ?? (await getWorkspaceFileInParentDirectory(wizardContext));
    // save uri variable for open project folder command
    wizardContext.workspacePath = await getWorkspaceRoot(wizardContext);
    if (wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
      const openWorkspaceMessage = localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${wizardContext.workspaceFilePath}. Do you want to open this workspace now?`
      );
      const shouldOpenWorkspace = await vscode.window.showInformationMessage(
        openWorkspaceMessage,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldOpenWorkspace === DialogResponses.yes) {
        await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(wizardContext.workspaceFilePath));
        context.telemetry.properties.openContainingWorkspace = 'true';
        return true;
      }
      context.telemetry.properties.openContainingWorkspace = 'false';
      return false;
    }

    if (!wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
      const createWorkspaceMessage = localize(
        'createContainingWorkspace',
        'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps (Standard) extension. Visual Studio Code will copy your projects to a new workspace. Do you want to create the workspace now?'
      );
      const shouldCreateWorkspace = await vscode.window.showInformationMessage(
        createWorkspaceMessage,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldCreateWorkspace === DialogResponses.yes) {
        const workspaceWizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
          title: localize('convertToWorkspace', 'Convert to workspace'),
          promptSteps: [new WorkspaceFolderStep(), new WorkspaceNameStep(), new WorkspaceFileStep()],
          executeSteps: [new OpenFolderStep()],
        });

        await workspaceWizard.prompt();
        await workspaceWizard.execute();
        context.telemetry.properties.createContainingWorkspace = 'true';
        window.showInformationMessage(localize('finishedConvertingWorkspace', 'Finished converting to workspace.'));
        return true;
      }
      context.telemetry.properties.createContainingWorkspace = 'false';
      return false;
    }

    context.telemetry.properties.isWorkspace = 'true';
    return true;
  }
}

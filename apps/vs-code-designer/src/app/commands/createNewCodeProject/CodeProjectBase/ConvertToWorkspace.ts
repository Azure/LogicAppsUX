import { extensionCommand, funcVersionSetting } from '../../../../constants';
import { localize } from '../../../../localize';
import { addLocalFuncTelemetry, tryGetLocalFuncVersion, tryParseFuncVersion } from '../../../utils/funcCoreTools/funcVersion';
import { getGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { FolderListStep } from '../../createNewProject/createProjectSteps/FolderListStep';
import { OpenFolderStepCodeProject } from './OpenFolderStepCodeProject';
import { AzureWizard, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import { window } from 'vscode';
import { getWorkspaceFile, getWorkspaceFileInParentDirectory, getWorkspaceFolder, getWorkspaceRoot } from '../../../utils/workspace';
import { WorkspaceNameStep } from './WorkspaceNameStep';
import { WorkspaceContentsStep } from './WorkspaceContentsStep';
import { isLogicAppProjectInRoot } from '../../../utils/verifyIsProject';

export async function convertToWorkspace(context: IActionContext): Promise<boolean> {
  const workspaceFolder = await getWorkspaceFolder(context, undefined, true);
  if (await isLogicAppProjectInRoot(workspaceFolder)) {
    addLocalFuncTelemetry(context);

    const version: string = getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
    const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, {
      version: tryParseFuncVersion(version),
    });

    context.telemetry.properties.isWorkspace = 'false';
    wizardContext.workspaceCustomFilePath =
      (await getWorkspaceFile(wizardContext)) ?? (await getWorkspaceFileInParentDirectory(wizardContext));
    //save uri variable for open project folder command
    wizardContext.customWorkspaceFolderPath = await getWorkspaceRoot(wizardContext);
    if (wizardContext.workspaceCustomFilePath && !wizardContext.customWorkspaceFolderPath) {
      const message = localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${wizardContext.workspaceCustomFilePath}. Do you want to open this workspace now?`
      );
      const result = await vscode.window.showInformationMessage(message, { modal: true }, DialogResponses.yes, DialogResponses.no);
      if (result === DialogResponses.yes) {
        await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(wizardContext.workspaceCustomFilePath));
        context.telemetry.properties.openContainingWorkspace = 'true';
        return true;
      }
      context.telemetry.properties.openContainingWorkspace = 'false';
      return false;
    }
    if (!wizardContext.workspaceCustomFilePath && !wizardContext.customWorkspaceFolderPath) {
      const message = localize(
        'createContainingWorkspace',
        'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps (Standard) extension. Visual Studio Code will copy your projects to a new workspace. Do you want to create the workspace now?'
      );
      const result = await vscode.window.showInformationMessage(message, { modal: true }, DialogResponses.yes, DialogResponses.no);
      if (result === DialogResponses.yes) {
        const workspaceWizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
          title: localize('convertToWorkspace', 'Convert to workspace'),
          promptSteps: [new FolderListStep(), new WorkspaceNameStep(), new WorkspaceContentsStep()],
          executeSteps: [new OpenFolderStepCodeProject()],
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

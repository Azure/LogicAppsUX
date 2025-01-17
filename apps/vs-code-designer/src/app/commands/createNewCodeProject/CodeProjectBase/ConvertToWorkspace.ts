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
import { SetWorkspaceName } from './SetWorkspaceName';
import { SetWorkspaceContents } from './SetWorkspaceContents';
import { isLogicAppProjectInRoot } from '../../../utils/verifyIsProject';

export async function ConvertToWorkspace(context: IActionContext): Promise<boolean> {
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
        `Full functionality of the Azure Logic Apps (Standard) extension is available only when the workspace is opened. Workspace found at ${wizardContext.workspaceCustomFilePath} that contains the logic app project. Do you want to open the workspace before continuing?`
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
        'Full functionality of the Azure Logic Apps (Standard) extension is available only when logic app project(s) are inside a workspace. Your project(s) will be copied over to the new workspace. Do you want to create the workspace before continuing?'
      );
      const result = await vscode.window.showInformationMessage(message, { modal: true }, DialogResponses.yes, DialogResponses.no);
      if (result === DialogResponses.yes) {
        const workspaceWizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
          title: localize('convertToWorkspace', 'Convert To Workspace'),
          promptSteps: [new FolderListStep(), new SetWorkspaceName(), new SetWorkspaceContents()],
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

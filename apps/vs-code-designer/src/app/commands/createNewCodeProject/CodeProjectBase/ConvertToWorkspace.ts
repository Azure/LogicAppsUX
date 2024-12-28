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
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { window } from 'vscode';
import { getWorkspaceFile, getWorkspaceFileInParentDirectory, getWorkspaceRoot } from '../../../utils/workspace';
import { SetWorkspaceName } from './SetWorkspaceName';
import { SetWorkspaceContents } from './SetWorkspaceContents';

export async function createWorkspaceFile(context: IFunctionWizardContext): Promise<void> {
  // Start with an empty folders array
  const workspaceFolders = [];

  // Add Functions folder first if it's a custom code code Logic App
  const functionsFolder = context.methodName;
  if (context.isWorkspaceWithFunctions) {
    workspaceFolders.push({ name: functionsFolder, path: `./${functionsFolder}` });
  }

  // Use context.logicAppName for the folder name; default to 'LogicApp' if not available
  const logicAppName = context.logicAppName || 'LogicApp';
  workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });

  const workspaceData = {
    folders: workspaceFolders,
  };

  const workspaceFilePath = path.join(context.customWorkspaceFolderPath, `${context.workspaceName}.code-workspace`);
  context.workspaceCustomFilePath = workspaceFilePath;

  await fse.writeJSON(workspaceFilePath, workspaceData, { spaces: 2 });
}

export async function ConvertToWorkspace(context: IActionContext): Promise<void> {
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
    } else {
      context.telemetry.properties.openContainingWorkspace = 'false';
      return;
    }
  } else if (!wizardContext.workspaceCustomFilePath && !wizardContext.customWorkspaceFolderPath) {
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
    } else {
      context.telemetry.properties.createContainingWorkspace = 'false';
      return;
    }
  } else {
    context.telemetry.properties.isWorkspace = 'true';
  }
}

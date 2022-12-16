/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectTemplateKeySetting } from '../../../constants';
import { localize } from '../../../localize';
import { getProjFiles } from '../../utils/dotnet/dotnet';
import { NoWorkspaceError } from '../../utils/errors';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { verifyAndPromptToCreateProject } from '../../utils/verifyIsProject';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { verifyInitForVSCode } from '../../utils/vsCodeConfig/verifyInitForVSCode';
import { getContainingWorkspace } from '../../utils/workspace';
import { WorkflowListStep } from './createCodelessSteps/WorkflowListStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard, UserCancelledError } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext } from '@microsoft/vscode-extension';
import { ProjectLanguage, FuncVersion, WorkflowProjectType } from '@microsoft/vscode-extension';
import { commands, window, workspace } from 'vscode';
import type { MessageItem, Uri, WorkspaceFolder } from 'vscode';

export async function createCodeless(
  context: IActionContext,
  workspacePath?: string | undefined,
  templateId?: string,
  logicAppName?: string,
  triggerSettings?: { [key: string]: string | undefined },
  language?: ProjectLanguage,
  version?: FuncVersion
): Promise<void> {
  addLocalFuncTelemetry(context);

  workspacePath = typeof workspacePath === 'string' ? workspacePath : undefined;

  let workspaceFolder: WorkspaceFolder | undefined;
  if (workspacePath === undefined) {
    workspaceFolder = await getWorkspaceFolder(context);
    workspacePath = workspaceFolder.uri.fsPath;
  } else {
    workspaceFolder = getContainingWorkspace(workspacePath);
  }

  const projectPath: string | undefined = await verifyAndPromptToCreateProject(context, workspacePath);
  if (!projectPath) {
    return;
  }

  let workflowProjectType: WorkflowProjectType = WorkflowProjectType.Bundle;
  const projectFiles = await getProjFiles(context, ProjectLanguage.CSharp, projectPath);
  if (projectFiles.length > 0) {
    workflowProjectType = WorkflowProjectType.Nuget;
  }

  [language, version] = await verifyInitForVSCode(context, projectPath, language, version);

  if (version !== FuncVersion.v2 && version !== FuncVersion.v3 && version !== FuncVersion.v4) {
    throw new Error(
      localize(
        'versionNotSupported',
        'Functions version "{0}" not supported. Only version "{1}" is currently supported for Codeless.',
        version,
        FuncVersion.v2
      )
    );
  }

  const projectTemplateKey: string | undefined = getWorkspaceSetting(projectTemplateKeySetting, projectPath);
  const wizardContext: IFunctionWizardContext = Object.assign(context, {
    projectPath,
    workspacePath,
    workspaceFolder,
    version,
    language,
    functionName: logicAppName,
    workflowProjectType,
    projectTemplateKey,
  });
  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    promptSteps: [await WorkflowListStep.create(wizardContext, { templateId, triggerSettings, isProjectWizard: false })],
  });
  await wizard.prompt();
  await wizard.execute();
}

async function getWorkspaceFolder(context: IActionContext): Promise<WorkspaceFolder> {
  let folder: WorkspaceFolder | undefined;
  if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
    const message: string = localize('noWorkspaceWarning', 'You must have a project open to create a function.');
    const newProject: MessageItem = { title: localize('createNewProject', 'Create new project') };
    const openExistingProject: MessageItem = { title: localize('openExistingProject', 'Open existing project') };
    const result: MessageItem = await context.ui.showWarningMessage(message, { modal: true }, newProject, openExistingProject);

    if (result === newProject) {
      // don't wait
      commands.executeCommand('azureLogicAppsStandard.createNewProject');
      context.telemetry.properties.noWorkspaceResult = 'createNewProject';
    } else {
      const uri: Uri[] = await context.ui.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: localize('open', 'Open'),
      });
      // don't wait
      commands.executeCommand('vscode.openFolder', uri[0]);
      context.telemetry.properties.noWorkspaceResult = 'openExistingProject';
    }

    context.errorHandling.suppressDisplay = true;
    throw new NoWorkspaceError();
  } else if (workspace.workspaceFolders.length === 1) {
    folder = workspace.workspaceFolders[0];
  } else {
    const placeHolder: string = localize('selectProjectFolder', 'Select the folder containing your function project');
    folder = await window.showWorkspaceFolderPick({ placeHolder });
    if (!folder) {
      throw new UserCancelledError();
    }
  }

  return folder;
}

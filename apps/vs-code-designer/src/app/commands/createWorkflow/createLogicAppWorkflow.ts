import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { isLogicAppProject } from '../../utils/verifyIsProject';
import type { IFunctionWizardContext, IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  createLibFolder,
  createLocalConfigurationFiles,
  createLogicAppAndWorkflow,
  createRulesFiles,
  updateWorkspaceFile,
} from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { localize } from '../../../localize';
import { createArtifactsFolder } from '../../utils/codeless/artifacts';
import { isGitInstalled, isInsideRepo, gitInit } from '../../utils/git';
import { CreateFunctionAppFiles } from '../createNewCodeProject/CodeProjectBase/CreateFunctionAppFiles';
import { createLogicAppVsCodeContents } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppVSCodeContents';

export async function createLogicAppWorkflow(context: IActionContext, options: any, workspaceRootFolder: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const webviewProjectContext: IWebviewProjectContext = options;
  // Create the workspace folder
  const workspaceFolder = workspaceRootFolder;
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, webviewProjectContext.logicAppName);

  // Check if the logic app directory already exists
  const logicAppExists = await fse.pathExists(logicAppFolderPath);
  let doesLogicAppExist = false;
  if (logicAppExists) {
    // Check if it's actually a Logic App project
    doesLogicAppExist = await isLogicAppProject(logicAppFolderPath);
  }

  // Check if we're in a workspace and get the workspace folder
  if (vscode.workspace.workspaceFile) {
    // Get the directory containing the .code-workspace file
    const workspaceFilePath = vscode.workspace.workspaceFile.fsPath;
    webviewProjectContext.workspaceFilePath = workspaceFilePath;
    webviewProjectContext.shouldCreateLogicAppProject = !doesLogicAppExist;
    // need to get logic app in projects
    await updateWorkspaceFile(webviewProjectContext);
  } else {
    // Fall back to the newly created workspace folder if not in a workspace
    vscode.window.showErrorMessage(
      localize('notInWorkspace', 'Please open an existing logic app workspace before trying to add a new logic app project.')
    );
    return;
  }

  const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
  mySubContext.logicAppName = options.logicAppName;
  mySubContext.projectPath = logicAppFolderPath;
  mySubContext.projectType = webviewProjectContext.logicAppType as ProjectType;
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  if (!doesLogicAppExist) {
    await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath);

    // .vscode folder
    await createLogicAppVsCodeContents(webviewProjectContext, logicAppFolderPath);

    await createLocalConfigurationFiles(webviewProjectContext, logicAppFolderPath);

    if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
      await gitInit(workspaceFolder);
    }

    await createArtifactsFolder(mySubContext);
    await createRulesFiles(mySubContext);
    await createLibFolder(mySubContext);
  }

  if (webviewProjectContext.logicAppType === ProjectType.customCode || webviewProjectContext.logicAppType === ProjectType.rulesEngine) {
    const createFunctionAppFilesStep = new CreateFunctionAppFiles();
    await createFunctionAppFilesStep.setup(mySubContext);
  }
  vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}

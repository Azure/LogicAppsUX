import { localize } from '../../../../localize';
import { createArtifactsFolder } from '../../../utils/codeless/artifacts';
import { addLocalFuncTelemetry } from '../../../utils/funcCoreTools/funcVersion';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { gitInit, isGitInstalled, isInsideRepo } from '../../../utils/git';
import { CreateFunctionAppFiles } from './CreateFunctionAppFiles';
import type { IFunctionWizardContext, IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { createLogicAppVsCodeContents } from './CreateLogicAppVSCodeContents';
import { isLogicAppProject } from '../../../utils/verifyIsProject';
import {
  createLibFolder,
  createLocalConfigurationFiles,
  createLogicAppAndWorkflow,
  createRulesFiles,
  updateWorkspaceFile,
} from './CreateLogicAppWorkspace';
import { devContainerFolderName, devContainerFileName } from '../../../../constants';

export async function createLogicAppProject(context: IActionContext, options: any, workspaceRootFolder: any): Promise<void> {
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

    // Detect if this is a devcontainer project by checking:
    // 1. If .devcontainer folder exists in workspace file
    // 2. If devcontainer.json exists in that folder
    webviewProjectContext.isDevContainerProject = await isDevContainerWorkspace(workspaceFilePath, workspaceFolder);

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
  mySubContext.projectType = webviewProjectContext.logicAppType;
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionNamespace;
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

/**
 * Checks if the workspace is a devcontainer project by:
 * 1. Checking if .devcontainer folder is listed in the workspace file
 * 2. Verifying that devcontainer.json exists in that folder
 * @param workspaceFilePath - Path to the .code-workspace file
 * @param workspaceFolder - Root folder of the workspace
 * @returns true if this is a devcontainer workspace, false otherwise
 */
async function isDevContainerWorkspace(workspaceFilePath: string, workspaceFolder: string): Promise<boolean> {
  // Read the workspace file
  const workspaceFileContent = await fse.readJSON(workspaceFilePath);

  // Check if .devcontainer folder is in the workspace folders
  const folders = workspaceFileContent.folders || [];
  const hasDevContainerFolder = folders.some(
    (folder: any) => folder.path === devContainerFolderName || folder.path === `./${devContainerFolderName}`
  );

  if (!hasDevContainerFolder) {
    return false;
  }

  // Verify devcontainer.json actually exists
  const devContainerJsonPath = path.join(workspaceFolder, devContainerFolderName, devContainerFileName);
  const devContainerJsonExists = await fse.pathExists(devContainerJsonPath);

  return devContainerJsonExists;
}

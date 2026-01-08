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
import { getAzureConnectorDetailsForLocalProject } from '../../../utils/codeless/common';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';

export async function createLogicAppProject(context: IActionContext, options: any, workspaceRootFolder: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const myWebviewProjectContext: IWebviewProjectContext = options;
  // Create the workspace folder
  const workspaceFolder = workspaceRootFolder;
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, myWebviewProjectContext.logicAppName);

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
    myWebviewProjectContext.workspaceFilePath = workspaceFilePath;
    myWebviewProjectContext.shouldCreateLogicAppProject = !doesLogicAppExist;
    // need to get logic app in projects
    await updateWorkspaceFile(myWebviewProjectContext);
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
  mySubContext.projectType = myWebviewProjectContext.logicAppType as ProjectType;
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionNamespace;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  if (!doesLogicAppExist) {
    await createLogicAppAndWorkflow(myWebviewProjectContext, logicAppFolderPath);

    // .vscode folder
    await createLogicAppVsCodeContents(myWebviewProjectContext, logicAppFolderPath);

    await createLocalConfigurationFiles(myWebviewProjectContext, logicAppFolderPath);

    if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
      await gitInit(workspaceFolder);
    }

    await createArtifactsFolder(mySubContext);
    await createRulesFiles(mySubContext);
    await createLibFolder(mySubContext);
  }

  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    const createFunctionAppFilesStep = new CreateFunctionAppFiles();
    await createFunctionAppFilesStep.setup(mySubContext);
  }

  getAzureConnectorDetailsForLocalProject(context, logicAppFolderPath);
  startDesignTimeApi(logicAppFolderPath);

  vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}

import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IWebviewProjectContext, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { createLogicAppAndWorkflow } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { localize } from '../../../localize';
import { isCodefulProject } from '../../utils/codeful';
import { ProjectType as ProjectTypeEnum } from '@microsoft/vscode-extension-logic-apps';

export async function createLogicAppWorkflow(context: IActionContext, options: any, logicAppFolderPath: string) {
  addLocalFuncTelemetry(context);

  const webviewProjectContext: IWebviewProjectContext = options;
  const logicAppExists = await fse.pathExists(logicAppFolderPath);
  if (logicAppExists) {
    // Check if it's actually a Logic App project
  }

  // If logicAppType is not set in options, check if this is a codeful project
  if (!webviewProjectContext.logicAppType) {
    const isCodeful = await isCodefulProject(logicAppFolderPath);
    if (isCodeful) {
      webviewProjectContext.logicAppType = ProjectTypeEnum.agentCodeful;
    }
  }

  // Check if we're in a workspace and get the workspace folder
  if (vscode.workspace.workspaceFile) {
    // Get the directory containing the .code-workspace file
    const workspaceFilePath = vscode.workspace.workspaceFile.fsPath;
    webviewProjectContext.workspaceFilePath = workspaceFilePath;
    webviewProjectContext.shouldCreateLogicAppProject = false;

    const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
    mySubContext.logicAppName = options.logicAppName;
    mySubContext.projectPath = logicAppFolderPath;
    mySubContext.projectType = webviewProjectContext.logicAppType as ProjectType;
    mySubContext.functionFolderName = options.functionFolderName;
    mySubContext.targetFramework = options.targetFramework;

    await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath);
    vscode.window.showInformationMessage(localize('finishedCreatingWorkflow', 'Finished creating workflow.'));
  } else {
    // Fall back to the newly created workspace folder if not in a workspace
    vscode.window.showErrorMessage(
      localize('notInWorkspace', 'Please open an existing logic app workspace before trying to add a new logic app project.')
    );
    return;
  }
}

import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { type IFunctionWizardContext, type IWebviewProjectContext, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import * as vscode from 'vscode';
import { createLogicAppAndWorkflow } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { localize } from '../../../localize';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
import { ext } from '../../../extensionVariables';

export async function createLogicAppWorkflow(context: IActionContext, options: any, logicAppFolderPath: string) {
  addLocalFuncTelemetry(context);

  const webviewProjectContext: IWebviewProjectContext = options;

  // If logicAppType is not set in options, check if this is a codeful project
  if (!webviewProjectContext.logicAppType) {
    const isCodeful = await hasCodefulWorkflowSetting(logicAppFolderPath);
    if (isCodeful) {
      webviewProjectContext.logicAppType = ProjectType.codeful;
    }
  }

  if (vscode.workspace.workspaceFile) {
    webviewProjectContext.workspaceFilePath = vscode.workspace.workspaceFile.fsPath;
  }
  webviewProjectContext.shouldCreateLogicAppProject = false;

  const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
  mySubContext.logicAppName = options.logicAppName;
  mySubContext.projectPath = logicAppFolderPath;
  mySubContext.projectType = webviewProjectContext.logicAppType;
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.targetFramework = options.targetFramework;

  await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath, context);
  ext.outputChannel.appendLog(localize('finishedCreatingWorkflow', 'Finished creating workflow.'));
}

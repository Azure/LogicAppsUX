import { vscodeCommand } from '../../constants';
import { localize } from '../../localize';
import { addLocalFuncTelemetry } from '../utils/funcCoreTools/funcVersion';
import { callWithTelemetryAndErrorHandling, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import {
  ExtensionCommand,
  type IWebviewProjectContext,
  ProjectName,
  type IFunctionWizardContext,
} from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import {
  getWorkspaceFilePath,
  getWorkspaceFilePathInParent,
  getWorkspaceFolderWithoutPrompting,
} from '../utils/workspace';
import { isLogicAppProject, isLogicAppProjectInRoot } from '../utils/verifyIsProject';
import { ext } from '../../extensionVariables';
import * as fse from 'fs-extra';
import * as path from 'path';
import { createWorkspaceWebviewCommandHandler } from './shared/workspaceWebviewCommandHandler';

/**
 * Ensures that the current workspace is properly set up for Azure Logic Apps (Standard) projects.
 * If the workspace is not correctly configured, it will prompt the user to open or create a workspace.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<boolean>} - A promise that resolves to true if the workspace is correctly set up, false otherwise.
 */
export async function ensureWorkspace(context: IActionContext): Promise<boolean> {
  const workspaceFolder = await getWorkspaceFolderWithoutPrompting();
  if (!(await isLogicAppProjectInRoot(workspaceFolder))) {
    return false;
  }

  addLocalFuncTelemetry(context);

  const wizardContext = context as Partial<IFunctionWizardContext> & IActionContext;
  context.telemetry.properties.isWorkspace = 'false';
  const openedWorkspaceFilePath = await getWorkspaceFilePath();
  const workspaceFilePath = openedWorkspaceFilePath ?? (await getWorkspaceFilePathInParent());
  wizardContext.workspaceFilePath = workspaceFilePath;
  wizardContext.workspacePath = workspaceFilePath ? path.dirname(workspaceFilePath) : undefined;

  if (workspaceFilePath && !openedWorkspaceFilePath) {
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
      await vscode.commands.executeCommand(vscodeCommand.openFolder, vscode.Uri.file(wizardContext.workspaceFilePath));
      context.telemetry.properties.openContainingWorkspace = 'true';
      return true;
    }
    context.telemetry.properties.openContainingWorkspace = 'false';
    return false;
  }

  if (!workspaceFilePath) {
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
      return await createWorkspaceStructureWebview();
    }
    context.telemetry.properties.createContainingWorkspace = 'false';
    return false;
  }

  context.telemetry.properties.isWorkspace = 'true';
  return true;
}

async function createWorkspaceStructureWebview(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    createWorkspaceWebviewCommandHandler({
      panelName: localize('createWorkspaceStructure', 'Create workspace structure'),
      panelGroupKey: ext.webViewKey.createWorkspaceStructure,
      projectName: ProjectName.createWorkspaceStructure,
      createCommand: ExtensionCommand.createWorkspaceStructure,
      createHandler: async (data: any) => {
        await callWithTelemetryAndErrorHandling(ExtensionCommand.createWorkspaceStructure, async (actionContext: IActionContext) => {
          await createWorkspaceFile(actionContext, data);
        });
      },
      onResolve: resolve,
    });
  });
}

export async function createWorkspaceFile(context: IActionContext, options: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const webviewProjectContext: IWebviewProjectContext = options;

  // Add telemetry properties for debugging
  context.telemetry.properties.hasWorkspaceProjectPath = String(!!webviewProjectContext.workspaceProjectPath);
  context.telemetry.properties.workspaceProjectPathType = typeof webviewProjectContext.workspaceProjectPath;
  context.telemetry.properties.receivedOptionsKeys = Object.keys(options || {}).join(',');

  // Validate that workspaceProjectPath exists and has required properties
  if (!webviewProjectContext.workspaceProjectPath || !webviewProjectContext.workspaceProjectPath.fsPath) {
    const errorMessage = `[EnsureWorkspace] Invalid workspaceProjectPath: ${JSON.stringify(
      {
        hasWorkspaceProjectPath: !!webviewProjectContext.workspaceProjectPath,
        workspaceProjectPathType: typeof webviewProjectContext.workspaceProjectPath,
        workspaceProjectPathValue: webviewProjectContext.workspaceProjectPath,
        contextKeys: Object.keys(options || {}),
      },
      null,
      2
    )}`;
    ext.outputChannel.appendLog(errorMessage);
    throw new Error(
      `workspaceProjectPath is required and must have an fsPath property. Received: ${JSON.stringify(webviewProjectContext.workspaceProjectPath)}`
    );
  }

  const workspaceFolderPath = path.join(webviewProjectContext.workspaceProjectPath.fsPath, webviewProjectContext.workspaceName);

  await fse.ensureDir(workspaceFolderPath);
  const workspaceFilePath = path.join(workspaceFolderPath, `${webviewProjectContext.workspaceName}.code-workspace`);

  // Start with an empty folders array
  const workspaceFolders = [];
  const foldersToAdd = vscode.workspace.workspaceFolders;

  if (foldersToAdd && foldersToAdd.length === 1) {
    const folder = foldersToAdd[0];
    const folderPath = folder.uri.fsPath;
    if (await isLogicAppProject(folderPath)) {
      const destinationPath = path.join(workspaceFolderPath, folder.name);
      await fse.copy(folderPath, destinationPath);
      workspaceFolders.push({ name: folder.name, path: `./${folder.name}` });
    } else {
      const subpaths: string[] = await fse.readdir(folderPath);
      for (const subpath of subpaths) {
        const fullPath = path.join(folderPath, subpath);
        const destinationPath = path.join(workspaceFolderPath, subpath);
        await fse.copy(fullPath, destinationPath);
        workspaceFolders.push({ name: subpath, path: `./${subpath}` });
      }
    }
  }

  const workspaceData = {
    folders: workspaceFolders,
  };

  await fse.writeJson(workspaceFilePath, workspaceData, { spaces: 2 });

  const uri = vscode.Uri.file(workspaceFilePath);

  await vscode.commands.executeCommand(vscodeCommand.openFolder, uri, true /* forceNewWindow */);
}

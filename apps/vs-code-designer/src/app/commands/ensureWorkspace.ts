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
  getWorkspaceFile,
  getWorkspaceFileInParentDirectory,
  getWorkspaceFolderWithoutPrompting,
  getWorkspaceRoot,
} from '../utils/workspace';
import { isLogicAppProject, isLogicAppProjectInRoot } from '../utils/verifyIsProject';
import { ext } from '../../extensionVariables';
import * as fse from 'fs-extra';
import * as path from 'path';
import { createWorkspaceWebviewCommandHandler } from './shared/workspaceWebviewCommandHandler';
import { isPathEqual } from '../utils/fs';

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
  wizardContext.workspaceFilePath = (await getWorkspaceFile(wizardContext)) ?? (await getWorkspaceFileInParentDirectory(wizardContext));
  // save uri variable for open project folder command
  wizardContext.workspacePath = await getWorkspaceRoot(wizardContext);
  if (wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
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

  if (!wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
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
  const currentFolder = vscode.workspace.workspaceFolders?.[0];
  const currentFolderPath = currentFolder?.uri.fsPath ?? '';

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
      extraInitializeData: {
        currentFolderPath,
      },
      onResolve: resolve,
    });
  });
}

export async function createWorkspaceFile(context: IActionContext, options: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const webviewProjectContext = validateWorkspaceProjectPath(options);

  context.telemetry.properties.hasWorkspaceProjectPath = 'true';
  context.telemetry.properties.receivedOptionsKeys = Object.keys(options || {}).join(',');

  const workspaceFolderPath = path.join(webviewProjectContext.workspaceProjectPath.fsPath, webviewProjectContext.workspaceName);
  const currentFolder = vscode.workspace.workspaceFolders?.[0];
  const currentFolderPath = currentFolder?.uri.fsPath;
  const isInPlace = currentFolderPath !== undefined && isPathEqual(workspaceFolderPath, currentFolderPath);

  context.telemetry.properties.isInPlace = String(isInPlace);

  if (isInPlace) {
    // In-place: the workspace folder IS the current project folder.
    // Just write the .code-workspace file — no copying needed.
    const workspaceFolders = await buildInPlaceWorkspaceFolders(currentFolderPath);
    const workspaceFilePath = path.join(workspaceFolderPath, `${webviewProjectContext.workspaceName}.code-workspace`);
    await fse.writeJson(workspaceFilePath, { folders: workspaceFolders }, { spaces: 2 });
    await vscode.commands.executeCommand(vscodeCommand.openFolder, vscode.Uri.file(workspaceFilePath), true);
  } else {
    // Different location: copy project files into the new workspace folder.
    await fse.ensureDir(workspaceFolderPath);
    const workspaceFolders = await copyWorkspaceFolders(workspaceFolderPath);
    const workspaceFilePath = path.join(workspaceFolderPath, `${webviewProjectContext.workspaceName}.code-workspace`);
    await fse.writeJson(workspaceFilePath, { folders: workspaceFolders }, { spaces: 2 });
    await vscode.commands.executeCommand(vscodeCommand.openFolder, vscode.Uri.file(workspaceFilePath), true);
  }
}

/**
 * Builds workspace folder descriptors for the in-place case (no copying).
 * If the current folder is a Logic App project, it becomes a single entry referencing ".".
 * Otherwise, each child directory becomes a workspace entry.
 */
async function buildInPlaceWorkspaceFolders(currentFolderPath: string): Promise<Array<{ name: string; path: string }>> {
  if (await isLogicAppProject(currentFolderPath)) {
    return [{ name: path.basename(currentFolderPath), path: '.' }];
  }

  // Each child is a separate workspace entry
  const entries: Array<{ name: string; path: string }> = [];
  const children = await fse.readdir(currentFolderPath, { withFileTypes: true });
  for (const child of children) {
    if (child.isDirectory()) {
      entries.push({ name: child.name, path: `./${child.name}` });
    }
  }
  return entries;
}

/**
 * Copies workspace folders from the current VS Code workspace into a new location
 * and returns workspace folder descriptors.
 */
async function copyWorkspaceFolders(workspaceFolderPath: string): Promise<Array<{ name: string; path: string }>> {
  const foldersToAdd = vscode.workspace.workspaceFolders;
  if (!foldersToAdd || foldersToAdd.length !== 1) {
    return [];
  }

  const folder = foldersToAdd[0];
  const sourcePath = folder.uri.fsPath;

  if (await isLogicAppProject(sourcePath)) {
    const destPath = path.join(workspaceFolderPath, folder.name);
    await fse.copy(sourcePath, destPath);
    return [{ name: folder.name, path: `./${folder.name}` }];
  }

  // Each child becomes a separate workspace entry
  const entries: Array<{ name: string; path: string }> = [];
  const children = await fse.readdir(sourcePath);
  for (const child of children) {
    const fullPath = path.join(sourcePath, child);
    await fse.copy(fullPath, path.join(workspaceFolderPath, child));
    entries.push({ name: child, path: `./${child}` });
  }
  return entries;
}

function validateWorkspaceProjectPath(options: any): IWebviewProjectContext {
  const ctx: IWebviewProjectContext = options;
  if (!ctx.workspaceProjectPath?.fsPath) {
    const detail = JSON.stringify({
      hasWorkspaceProjectPath: !!ctx.workspaceProjectPath,
      type: typeof ctx.workspaceProjectPath,
      value: ctx.workspaceProjectPath,
      keys: Object.keys(options || {}),
    });
    ext.outputChannel.appendLog(`[EnsureWorkspace] Invalid workspaceProjectPath: ${detail}`);
    throw new Error(
      `workspaceProjectPath is required and must have an fsPath property. Received: ${JSON.stringify(ctx.workspaceProjectPath)}`
    );
  }
  return ctx;
}

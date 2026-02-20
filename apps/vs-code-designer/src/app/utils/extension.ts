/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, logicAppsStandardExtensionId, customExtensionContext } from '../../constants';
import * as vscode from 'vscode';
import {
  supportedDataMapDefinitionFileExts,
  supportedDataMapperFolders,
  supportedSchemaFileExts,
} from '../commands/dataMapper/extensionConfig';
import { getWorkspaceFolderWithoutPrompting } from './workspace';
import { isLogicAppProjectInRoot } from './verifyIsProject';
import { detectCodefulWorkflow, hasCodefulWorkflowSetting } from './codeful';
import * as path from 'path';

/**
 * Gets extension version from the package.json version.
 * @returns {string} Extension version.
 */
export const getExtensionVersion = (): string => {
  const extension = vscode.extensions.getExtension(logicAppsStandardExtensionId);

  if (extension) {
    const { packageJSON } = extension;

    if (packageJSON) {
      const version = packageJSON.version;
      return version;
    }
  }

  return '';
};

export const initializeCustomExtensionContext = () => {
  // Data Mapper context
  vscode.commands.executeCommand(
    'setContext',
    extensionCommand.dataMapSetSupportedDataMapDefinitionFileExts,
    supportedDataMapDefinitionFileExts
  );
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetSupportedSchemaFileExts, supportedSchemaFileExts);
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetSupportedFileExts, [
    ...supportedDataMapDefinitionFileExts,
    ...supportedSchemaFileExts,
  ]);
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetDmFolders, supportedDataMapperFolders);
};

export async function updateLogicAppsContext() {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    await vscode.commands.executeCommand('setContext', 'logicApps.hasProject', false);
  } else {
    const workspaceFolder = await getWorkspaceFolderWithoutPrompting();
    const logicAppOpened = await isLogicAppProjectInRoot(workspaceFolder);
    await vscode.commands.executeCommand('setContext', 'logicApps.hasProject', logicAppOpened);
  }
}

/**
 * Scans workspace for .cs files that are codeful workflows and returns their paths.
 * Only scans projects that have WORKFLOW_CODEFUL_ENABLED set to true in local.settings.json.
 * @returns Array of file paths that contain codeful workflow definitions
 */
export async function scanWorkspaceForCodefulWorkflows(): Promise<string[]> {
  const codefulWorkflowFiles: string[] = [];

  // First, find all local.settings.json files
  const settingsFiles = await vscode.workspace.findFiles('**/local.settings.json', '**/node_modules/**');

  // Check which projects have codeful workflows enabled
  const codefulProjectPaths: string[] = [];
  for (const settingsUri of settingsFiles) {
    const projectPath = path.dirname(settingsUri.fsPath);
    const isCodeful = await hasCodefulWorkflowSetting(projectPath);
    if (isCodeful) {
      codefulProjectPaths.push(projectPath);
    }
  }

  // If no codeful projects found, return empty array
  if (codefulProjectPaths.length === 0) {
    return codefulWorkflowFiles;
  }

  // Now scan .cs files only in codeful project directories
  const csFiles = await vscode.workspace.findFiles('**/*.cs', '**/node_modules/**');

  for (const fileUri of csFiles) {
    // Check if this .cs file is within a codeful project
    const filePath = fileUri.fsPath;
    const isInCodefulProject = codefulProjectPaths.some((projectPath) => filePath.startsWith(projectPath));

    if (!isInCodefulProject) {
      continue;
    }

    try {
      const document = await vscode.workspace.openTextDocument(fileUri);
      const fileContent = document.getText();
      const workflowInfo = detectCodefulWorkflow(fileContent);

      if (workflowInfo) {
        codefulWorkflowFiles.push(fileUri.fsPath);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return codefulWorkflowFiles;
}

/**
 * Updates context with the list of codeful workflow file paths.
 */
export async function updateCodefulWorkflowFilesContext(): Promise<void> {
  const codefulWorkflowFiles = await scanWorkspaceForCodefulWorkflows();
  await vscode.commands.executeCommand('setContext', customExtensionContext.codefulWorkflowFiles, codefulWorkflowFiles);
}

/**
 * Updates the context to indicate if the current file is a codeful workflow file.
 * @param editor The active text editor
 */
export function updateCodefulWorkflowContext(editor: vscode.TextEditor | undefined): void {
  if (!editor) {
    vscode.commands.executeCommand('setContext', customExtensionContext.isCodefulWorkflowFile, false);
    return;
  }

  const document = editor.document;

  // Only check .cs files
  if (document.languageId !== 'csharp' || !document.fileName.endsWith('.cs')) {
    vscode.commands.executeCommand('setContext', customExtensionContext.isCodefulWorkflowFile, false);
    return;
  }

  try {
    const fileContent = document.getText();
    const workflowInfo = detectCodefulWorkflow(fileContent);

    vscode.commands.executeCommand('setContext', customExtensionContext.isCodefulWorkflowFile, !!workflowInfo);
  } catch {
    vscode.commands.executeCommand('setContext', customExtensionContext.isCodefulWorkflowFile, false);
  }
}

/**
 * Registers a listener for active editor changes to update codeful workflow context.
 * Also scans workspace for codeful workflow files and watches for file changes.
 * @param context The extension context
 */
export function registerCodefulWorkflowContextListener(context: vscode.ExtensionContext): void {
  // Update context for the currently active editor
  updateCodefulWorkflowContext(vscode.window.activeTextEditor);

  // Initial scan of workspace for codeful workflow files
  updateCodefulWorkflowFilesContext();

  // Register listener for active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateCodefulWorkflowContext(editor);
    })
  );

  // Also listen to document changes for the active editor
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
        updateCodefulWorkflowContext(vscode.window.activeTextEditor);
      }
    })
  );

  // Watch for .cs file changes and updates
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.cs');

  context.subscriptions.push(fileWatcher.onDidCreate(() => updateCodefulWorkflowFilesContext()));

  context.subscriptions.push(fileWatcher.onDidChange(() => updateCodefulWorkflowFilesContext()));

  context.subscriptions.push(fileWatcher.onDidDelete(() => updateCodefulWorkflowFilesContext()));

  context.subscriptions.push(fileWatcher);
}

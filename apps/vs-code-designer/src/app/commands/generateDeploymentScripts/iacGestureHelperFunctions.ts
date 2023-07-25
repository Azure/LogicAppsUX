/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowResourceGroupNameKey, workflowSubscriptionIdKey } from '../../../constants';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import type { IAzureScriptWizard } from './azureScriptWizard';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Checks if a folder is present in the workspace.
 * @param folder - The folder to check.
 * @returns True if the folder is in the workspace, false otherwise.
 */
export function isFolderInWorkspace(folder: vscode.Uri): boolean {
  return vscode.workspace.workspaceFolders?.some((workspaceFolder) => folder.fsPath.startsWith(workspaceFolder.uri.fsPath)) || false;
}

/**
 * Converts a folder to a workspace.
 * @param folder - The folder to convert.
 * @returns A promise that resolves when the folder is converted to a workspace.
 */
export async function convertToWorkspace(folder: vscode.Uri): Promise<void> {
  const parentFolder = path.dirname(folder.fsPath);
  const workspaceConfig: vscode.WorkspaceFolder[] = [
    {
      uri: vscode.Uri.file(parentFolder),
      name: path.basename(parentFolder),
      index: 0,
    },
  ];
  await vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, ...workspaceConfig);
}

/**
 * Creates the required file structure in the specified root folder.
 * @param root - The root folder where the file structure needs to be created.
 */
export function createFileStructure(root: string): void {
  const folders = ['Deployment', 'LogicAppApplication', 'DeploymentPipelineTemplates'];
  const files = ['Infrastructure-pipeline.yml', 'CI-pipeline.yml', 'CD-pipeline.yml', 'Pipeline-variables.yml'];

  folders.forEach((_folder) => createFolder(path.join(root, ...folders)));
  files.forEach((file) => createFile(path.join(root, ...folders, file)));
}

/**
 * Creates a folder at the specified path if it doesn't already exist.
 * @param path - The path of the folder to create.
 */
function createFolder(path: string): void {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

/**
 * Creates a file at the specified path if it doesn't already exist.
 * @param path - The path of the file to create.
 */
function createFile(path: string): void {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '');
  }
}

/**
 * Prompts the user for the subscription ID.
 * @param scriptContext - The script context.
 * @param folder - The folder where the local settings file is located.
 * @returns A promise that resolves to the subscription ID entered by the user.
 */
export async function promptForSubscriptionId(scriptContext: IAzureScriptWizard, folder: vscode.Uri): Promise<string> {
  return await getSettingFromLocalSettings(scriptContext, folder, workflowSubscriptionIdKey);
}

/**
 * Prompts the user for the resource group name.
 * @param scriptContext - The script context.
 * @param folder - The folder where the local settings file is located.
 * @returns A promise that resolves to the resource group name entered by the user.
 */
export async function promptForResourceGroup(scriptContext: IAzureScriptWizard, folder: vscode.Uri): Promise<string> {
  return await getSettingFromLocalSettings(scriptContext, folder, workflowResourceGroupNameKey);
}

/**
 * Retrieves a setting value from the local settings file.
 * @param scriptContext - The script context.
 * @param folder - The folder where the local settings file is located.
 * @param key - The key of the setting to retrieve.
 * @returns A promise that resolves to the value of the setting.
 */
async function getSettingFromLocalSettings(scriptContext: IAzureScriptWizard, folder: vscode.Uri, key: string): Promise<string> {
  const localSettingsPath = path.join(folder.fsPath, 'local.settings.json');
  const localSettings = await getLocalSettingsJson(scriptContext, localSettingsPath);
  return localSettings.Values?.[key] || '';
}

/**
 * Prompts the user for the source control path.
 * @returns A promise that resolves to the source control path entered by the user.
 */
export async function promptForSourceControlPath(): Promise<string> {
  // TODO: Prompt the user to select their source control path from a drop-down menu
  // This will involve fetching the list of source control paths associated with the user's Azure account
  return '';
}

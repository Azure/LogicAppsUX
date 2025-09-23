/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

/** Heuristic check to determine if VS Code is already running inside a dev container or Codespace. */
export function isInDevContainer(): boolean {
  return (
    vscode.env.remoteName === 'dev-container' || process.env.CODESPACES === 'true' || !!process.env.DEVCONTAINER || !!process.env.CONTAINER
  );
}

/** Returns the probable base path we should inspect for a .devcontainer directory. */
export function getDevContainerBasePath(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }
  if (vscode.workspace.workspaceFile) {
    return path.dirname(vscode.workspace.workspaceFile.fsPath);
  }
  return undefined;
}

/** Checks if a .devcontainer folder exists at the given base path. */
export function hasDevContainerFolder(basePath?: string): boolean {
  if (!basePath) {
    return false;
  }
  try {
    const devcontainerDir = path.join(basePath, '.devcontainer');
    return fs.existsSync(devcontainerDir) && fs.statSync(devcontainerDir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Attempts to execute the Dev Containers extension reopen command if we have a .devcontainer folder & are not already inside one.
 * Adds a telemetry property when provided a context.
 */
export async function tryReopenInDevContainer(context?: IActionContext): Promise<boolean> {
  if (isInDevContainer()) {
    return false;
  }
  const basePath = getDevContainerBasePath();
  const hasFolder = hasDevContainerFolder(basePath);
  if (context) {
    context.telemetry.properties.attemptedDevContainerReopen = hasFolder ? 'true' : 'false';
  }
  if (!hasFolder) {
    return false;
  }
  try {
    await vscode.commands.executeCommand('devcontainers.reopenInContainer');
    return true;
  } catch (err) {
    if (context) {
      context.telemetry.properties.devContainerReopenError = err instanceof Error ? err.message : String(err);
    }
    return false;
  }
}

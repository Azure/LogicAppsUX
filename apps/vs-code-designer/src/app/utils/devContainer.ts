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

/**
 * Checks if a .devcontainer folder exists at the directory that contains the .code-workspace file.
 * We climb up ancestors (bounded) until we find a directory containing a .code-workspace file; if found, we only
 * succeed when a .devcontainer folder is present in that same directory. If not found or .devcontainer missing, returns false.
 */
export function hasDevContainerFolder(basePath?: string): boolean {
  if (!basePath) {
    return false;
  }
  try {
    const maxLevels = 5; // small bound to avoid deep traversal
    let current = basePath;
    for (let i = 0; i <= maxLevels; i++) {
      if (dirHasWorkspaceFile(current)) {
        return dirHasDevContainer(current);
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break; // root
      }
      current = parent;
    }
  } catch {
    // ignore errors, treat as not found
  }
  return false;
}

function dirHasDevContainer(dir: string): boolean {
  try {
    const devcontainerDir = path.join(dir, '.devcontainer');
    return fs.existsSync(devcontainerDir) && fs.statSync(devcontainerDir).isDirectory();
  } catch {
    return false;
  }
}

function dirHasWorkspaceFile(dir: string): boolean {
  try {
    const entries = fs.readdirSync(dir);
    return entries.some((e) => e.endsWith('.code-workspace') && fs.statSync(path.join(dir, e)).isFile());
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
    const info = findWorkspaceFileAndRoot(basePath);
    if (info?.workspaceFilePath) {
      if (context) {
        context.telemetry.properties.devContainerWorkspaceArg = 'workspace-file';
      }
      // Try opening the workspace directly in a container.
      await vscode.commands.executeCommand('remote-containers.openWorkspace', vscode.Uri.file(info.workspaceFilePath));
    } else if (info?.rootDir) {
      if (context) {
        context.telemetry.properties.devContainerWorkspaceArg = 'root-dir';
      }
      await vscode.commands.executeCommand('remote-containers.openFolder', vscode.Uri.file(info.rootDir));
    } else {
      if (context) {
        context.telemetry.properties.devContainerWorkspaceArg = 'reopen-fallback';
      }
      await vscode.commands.executeCommand('remote-containers.reopenInContainer');
    }
    return true;
  } catch (err) {
    if (context) {
      context.telemetry.properties.devContainerReopenError = err instanceof Error ? err.message : String(err);
    }
    return false;
  }
}

/** Attempt to locate a .code-workspace file starting from basePath or using VS Code's current workspace reference. */
function findWorkspaceFileAndRoot(basePath?: string): { workspaceFilePath: string; rootDir: string } | undefined {
  // Prefer VS Code's current workspace file if present.
  if (vscode.workspace.workspaceFile) {
    const ws = vscode.workspace.workspaceFile.fsPath;
    return { workspaceFilePath: ws, rootDir: path.dirname(ws) };
  }
  if (!basePath) {
    return undefined;
  }
  const maxLevels = 5;
  let current = basePath;
  for (let i = 0; i <= maxLevels; i++) {
    const wsFile = firstWorkspaceFileInDir(current);
    if (wsFile) {
      return { workspaceFilePath: wsFile, rootDir: path.dirname(wsFile) };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return undefined;
}

function firstWorkspaceFileInDir(dir: string): string | undefined {
  try {
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
      if (e.endsWith('.code-workspace')) {
        const full = path.join(dir, e);
        if (fs.statSync(full).isFile()) {
          return full;
        }
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

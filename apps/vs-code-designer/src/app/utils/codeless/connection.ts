import { connectionsFileName } from '../../../constants';
import { tryGetFunctionProjectRoot } from '../verifyIsProject';
import { getContainingWorkspace } from '../workspace';
import { getParametersJson } from './parameter';
import type { Parameter } from './types';
import { nonNullValue } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';

export async function getConnectionsFromFile(context: IActionContext, workflowFilePath: string): Promise<string> {
  const projectRoot: string = await getFunctionProjectRoot(context, workflowFilePath);
  return getConnectionsJson(projectRoot);
}

export async function getParametersFromFile(context: IActionContext, workflowFilePath: string): Promise<Record<string, Parameter>> {
  const projectRoot: string = await getFunctionProjectRoot(context, workflowFilePath);
  return getParametersJson(projectRoot);
}

export async function getConnectionsJson(projectRoot: string): Promise<string> {
  const connectionFilePath: string = path.join(projectRoot, connectionsFileName);
  if (await fse.pathExists(connectionFilePath)) {
    const data: string = (await fse.readFile(connectionFilePath)).toString();
    if (/[^\s]/.test(data)) {
      return data;
    }
  }

  return '';
}

export async function getFunctionProjectRoot(context: IActionContext, workflowFilePath: string): Promise<string> {
  const workspaceFolder = nonNullValue(getContainingWorkspace(workflowFilePath), 'workspaceFolder');
  const workspacePath: string = workspaceFolder.uri.fsPath;

  const projectRoot: string | undefined = await tryGetFunctionProjectRoot(context, workspacePath);

  if (projectRoot === undefined) {
    throw new Error('Error in determining project root. Please confirm project structure is correct.');
  }

  return projectRoot;
}

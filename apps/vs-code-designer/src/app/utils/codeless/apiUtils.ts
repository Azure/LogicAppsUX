/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { connectionsFileName, managementApiPrefix, parametersFileName, workflowAppApiVersion } from '../../../constants';
import { localize } from '../../../localize';
import type { RemoteWorkflowTreeItem } from '../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { sendAzureRequest } from '../requestUtils';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  IParametersFileContent,
  IConnectionsFileContent,
  Parameter,
  IWorkflowFileContent,
  IArtifactFile,
  Artifacts,
} from '@microsoft/vscode-extension';
import * as path from 'path';
import * as vscode from 'vscode';

export async function getFileOrFolderContent(context: IActionContext, node: SlotTreeItem, filePath: string): Promise<string> {
  const url = `${node.id}/hostruntime/admin/vfs/${filePath}?api-version=${workflowAppApiVersion}&relativepath=1`;
  const response = await sendAzureRequest(url, context, 'GET', node.site.subscription);
  return response.bodyAsText;
}

export async function getParameters(context: IActionContext, node: SlotTreeItem): Promise<IParametersFileContent[]> {
  const parametersData = await getParameterFileContent(context, node);
  const parameters: IParametersFileContent[] = [];

  for (const parameterKey of Object.keys(parametersData)) {
    parameters.push({
      name: parameterKey,
      content: parametersData[parameterKey],
    });
  }

  return parameters;
}

export async function getParameterFileContent(context: IActionContext, node: SlotTreeItem): Promise<Record<string, Parameter>> {
  try {
    const data = await getFileOrFolderContent(context, node, parametersFileName);
    return JSON.parse(data);
  } catch (error) {
    if (error.statusCode === 404) {
      return {};
    } else {
      vscode.window.showErrorMessage(error.message, localize('OK', 'OK'));
      throw error;
    }
  }
}

export async function getWorkflow(
  node: SlotTreeItem,
  workflow: RemoteWorkflowTreeItem,
  context: IActionContext
): Promise<IWorkflowFileContent> {
  const url = `${node.id}/hostruntime/admin/vfs/${workflow.name}/workflow.json?api-version=${workflowAppApiVersion}&relativepath=1`;
  const response = await sendAzureRequest(url, context, HTTP_METHODS.GET, node.site.subscription);
  return response.parsedBody;
}

export async function listWorkflows(node: SlotTreeItem, context: IActionContext): Promise<Record<string, any>[]> {
  const url = `${node.id}/hostruntime${managementApiPrefix}/workflows?api-version=${workflowAppApiVersion}`;
  try {
    const response = await sendAzureRequest(url, context, 'GET', node.site.subscription);
    return response.parsedBody;
  } catch (error) {
    if (error.statusCode === 404) {
      return [];
    } else {
      throw error;
    }
  }
}

export async function getOptionalFileContent(context: IActionContext, node: SlotTreeItem, filePath: string): Promise<string> {
  try {
    return await getFileOrFolderContent(context, node, filePath);
  } catch (error) {
    if (error.statusCode === 404) {
      return '{}';
    } else {
      vscode.window.showErrorMessage(error.message, localize('OK', 'OK'));
      throw error;
    }
  }
}

async function getArtifactFiles(context: IActionContext, node: SlotTreeItem, folderPath: string): Promise<IArtifactFile[]> {
  try {
    const data = await getFileOrFolderContent(context, node, folderPath);
    const content = JSON.parse(data);
    return content.map((file) => ({
      name: file.name,
      path: `${folderPath}/${file.name}`,
    }));
  } catch (error) {
    if (error.statusCode === 404) {
      return [];
    } else {
      vscode.window.showErrorMessage(error.message, localize('OK', 'OK'));
      throw error;
    }
  }
}

export async function getAllArtifacts(context: IActionContext, node: SlotTreeItem): Promise<Artifacts> {
  const mapArtifacts = await getArtifactFiles(context, node, 'Artifacts/Maps');
  const schemaArtifacts = await getArtifactFiles(context, node, 'Artifacts/Schemas');
  const artifacts: Artifacts = { maps: {}, schemas: [] };

  for (const map of mapArtifacts) {
    const { name: fileName, path: filePath } = map;
    const extensionName = path.extname(fileName);
    const name = path.basename(fileName, extensionName);
    const normalizedExtensionName = extensionName.toLowerCase();

    if (!artifacts.maps[normalizedExtensionName]) {
      artifacts.maps[normalizedExtensionName] = [];
    }

    artifacts.maps[normalizedExtensionName].push({ name, fileName, relativePath: filePath });
  }

  artifacts.schemas = schemaArtifacts.map((artifact) => {
    const { name: fileName, path: filePath } = artifact;
    const extensionName = path.extname(fileName);
    const name = path.basename(fileName, extensionName);

    return {
      name,
      fileName,
      relativePath: filePath,
    };
  });

  return artifacts;
}

export async function getConnections(context: IActionContext, node: SlotTreeItem): Promise<IConnectionsFileContent[]> {
  const connectionJson = await getOptionalFileContent(context, node, connectionsFileName);
  const connectionsData = JSON.parse(connectionJson);
  const functionConnections = connectionsData.functionConnections || {};
  const connectionReferences = connectionsData.managedApiConnections || {};
  const serviceProviderConnections = connectionsData.serviceProviderConnections || {};
  const connections: IConnectionsFileContent[] = [];

  for (const connectionKey of Object.keys(connectionReferences)) {
    connections.push({
      name: connectionKey,
      content: connectionReferences[connectionKey],
      isManaged: true,
    });
  }

  for (const connectionKey of Object.keys(functionConnections)) {
    connections.push({
      name: connectionKey,
      content: functionConnections[connectionKey],
      isManaged: false,
    });
  }

  for (const connectionKey of Object.keys(serviceProviderConnections)) {
    connections.push({
      name: connectionKey,
      content: serviceProviderConnections[connectionKey],
      isManaged: false,
    });
  }

  return connections;
}

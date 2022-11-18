import { connectionsFileName } from '../../../constants';
import { addOrUpdateLocalAppSettings } from '../../funcConfig/local.settings';
import * as fsUtil from '../fs';
import { tryGetFunctionProjectRoot } from '../verifyIsProject';
import { getContainingWorkspace } from '../workspace';
import { getAuthorizationToken } from './getAuthorizationToken';
import { getParametersJson } from './parameter';
import { HTTP_METHODS } from '@microsoft-logic-apps/utils';
import type { Parameter } from '@microsoft-logic-apps/utils';
import { nonNullValue } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as requestP from 'request-promise';

export interface ConnectionReferenceModel {
  connection: {
    id: string;
  };
  api: {
    id: string;
  };
  connectionRuntimeUrl: string;
  authentication: {
    type: string;
    audience?: string;
    credentialType?: string;
    clientId?: string;
    tenant?: string;
    secret?: string;
    scheme?: string;
    parameter?: string;
  };
}

export interface FunctionConnectionModel {
  function: {
    id: string;
  };
  triggerUrl: string;
  authentication: {
    type: string;
    name: string;
    value: string;
  };
  displayName?: string;
}

export interface ServiceProviderConnectionModel {
  parameterValues: Record<string, any>;
  serviceProvider: {
    id: string;
  };
  displayName?: string;
}

export interface ConnectionsData {
  functionConnections?: Record<string, FunctionConnectionModel>;
  managedApiConnections?: Record<string, ConnectionReferenceModel>;
  serviceProviderConnections?: Record<string, ServiceProviderConnectionModel>;
}

interface ConnectionAndSettings {
  connections: ConnectionsData;
  settings: Record<string, string>;
}

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

async function getConnectionReference(
  referenceKey: string,
  reference: any,
  accessToken: string,
  workflowBaseManagementUri: string,
  settingsToAdd: Record<string, string>
): Promise<ConnectionReferenceModel> {
  const { connectionId, id } = reference;
  const options = {
    json: true,
    headers: { authorization: accessToken },
    method: HTTP_METHODS.POST,
    body: { validityTimeSpan: '7' },
    uri: `${workflowBaseManagementUri}/${connectionId}/listConnectionKeys?api-version=2018-07-01-preview`,
  };

  return requestP(options)
    .then((response) => {
      const appSettingKey = `${referenceKey}-connectionKey`;
      settingsToAdd[appSettingKey] = response.connectionKey; // eslint-disable-line no-param-reassign

      return {
        api: { id },
        connection: { id: connectionId },
        connectionRuntimeUrl: response.runtimeUrls.length ? response.runtimeUrls[0] : '',
        authentication: {
          type: 'Raw',
          scheme: 'Key',
          parameter: `@appsetting('${appSettingKey}')`,
        },
      };
    })
    .catch((error) => {
      throw new Error(`Error in fetching connection keys for ${connectionId}. ${error}`);
    });
}

export async function getConnectionsAndSettingsToUpdate(
  context: IActionContext,
  workflowFilePath: string,
  references: any,
  azureTenantId: string,
  workflowBaseManagementUri: string
): Promise<ConnectionAndSettings> {
  const projectPath = await getFunctionProjectRoot(context, workflowFilePath);
  const connectionsDataString = projectPath ? await getConnectionsJson(projectPath) : '';
  const connectionsData = connectionsDataString === '' ? {} : JSON.parse(connectionsDataString);

  const referencesToAdd = connectionsData.managedApiConnections || {};
  const settingsToAdd: Record<string, string> = {};
  let accessToken: string | undefined;

  for (const referenceKey of Object.keys(references)) {
    const reference = references[referenceKey];

    if (isApiHubConnectionId(reference.connectionId) && !referencesToAdd[referenceKey]) {
      accessToken = !accessToken ? await getAuthorizationToken(/* credentials */ undefined, azureTenantId) : accessToken;
      referencesToAdd[referenceKey] = await getConnectionReference(
        referenceKey,
        reference,
        accessToken,
        workflowBaseManagementUri,
        settingsToAdd
      );
    }
  }

  connectionsData.managedApiConnections = referencesToAdd;

  return {
    connections: connectionsData,
    settings: settingsToAdd,
  };
}

export async function saveConectionReferences(
  context: IActionContext,
  workflowFilePath: string,
  connectionAndSettingsToUpdate: ConnectionAndSettings
): Promise<void> {
  const projectPath = await getFunctionProjectRoot(context, workflowFilePath);
  const { connections, settings } = connectionAndSettingsToUpdate;
  const connectionsFilePath = path.join(projectPath!, connectionsFileName);

  if (connections && Object.keys(connections).length) {
    await fsUtil.writeFormattedJson(connectionsFilePath, connections);
  }

  if (Object.keys(settings).length) {
    await addOrUpdateLocalAppSettings(context, projectPath!, settings);
  }
}

export function containsApiHubConnectionReference(references: any): boolean {
  for (const referenceKey of Object.keys(references)) {
    const reference = references[referenceKey];

    if (isApiHubConnectionId(reference.connectionId)) {
      return true;
    }
  }

  return false;
}

function isApiHubConnectionId(connectionId: any): boolean {
  return connectionId.startsWith('/subscriptions/');
}

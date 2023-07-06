import { connectionsFileName } from '../../../constants';
import { localize } from '../../../localize';
import { isCSharpProject } from '../../commands/initProjectForVSCode/detectProjectLanguage';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { addOrUpdateLocalAppSettings } from '../appSettings/localSettings';
import { writeFormattedJson } from '../fs';
import { sendAzureRequest } from '../requestUtils';
import { tryGetFunctionProjectRoot } from '../verifyIsProject';
import { getContainingWorkspace } from '../workspace';
import { getWorkflowParameters } from './common';
import { getAuthorizationToken } from './getAuthorizationToken';
import { getParametersJson, saveWorkflowParameterRecords } from './parameter';
import * as parameterizer from './parameterizer';
import { addNewFileInCSharpProject } from './updateBuildFile';
import { HTTP_METHODS, isString } from '@microsoft/utils-logic-apps';
import { nonNullValue } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  ServiceProviderConnectionModel,
  ConnectionAndSettings,
  ConnectionReferenceModel,
  IIdentityWizardContext,
  ConnectionAcl,
  ConnectionAndAppSetting,
  Parameter,
} from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as requestP from 'request-promise';
import * as vscode from 'vscode';

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

export async function addConnectionData(
  context: IActionContext,
  filePath: string,
  ConnectionAndAppSetting: ConnectionAndAppSetting
): Promise<void> {
  const projectPath = await getFunctionProjectRoot(context, filePath);
  const jsonParameters = await getParametersFromFile(context, filePath);

  await addConnectionDataInJson(context, projectPath ?? '', ConnectionAndAppSetting, jsonParameters);

  const { settings } = ConnectionAndAppSetting;
  const workflowParameterRecords = getWorkflowParameters(jsonParameters);

  await addOrUpdateLocalAppSettings(context, projectPath ?? '', settings);
  await saveWorkflowParameterRecords(context, filePath, workflowParameterRecords);

  await vscode.window.showInformationMessage(localize('azureFunctions.addConnection', 'Connection added.'));
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

async function addConnectionDataInJson(
  context: IActionContext,
  functionAppPath: string,
  ConnectionAndAppSetting: ConnectionAndAppSetting,
  parametersData: Record<string, Parameter>
): Promise<void> {
  const connectionsFilePath = path.join(functionAppPath, connectionsFileName);
  const connectionsFileExists = fse.pathExistsSync(connectionsFilePath);

  const connectionsJsonString = await getConnectionsJson(functionAppPath);
  const connectionsJson = connectionsJsonString === '' ? {} : JSON.parse(connectionsJsonString);

  const { connectionData, connectionKey, pathLocation } = ConnectionAndAppSetting;

  let pathToSetConnectionsData = connectionsJson;

  for (const path of pathLocation) {
    if (!pathToSetConnectionsData[path]) {
      pathToSetConnectionsData[path] = {};
    }

    pathToSetConnectionsData = pathToSetConnectionsData[path];
  }

  if (pathToSetConnectionsData && pathToSetConnectionsData[connectionKey]) {
    const message: string = localize('ConnectionKeyAlreadyExist', "Connection key '{0}' already exists.", connectionKey);
    await vscode.window.showErrorMessage(message, localize('OK', 'OK'));
    return;
  }

  parameterizer.parameterizeConnection(connectionData, connectionKey, parametersData);

  pathToSetConnectionsData[connectionKey] = connectionData;
  await writeFormattedJson(connectionsFilePath, connectionsJson);

  if (!connectionsFileExists && (await isCSharpProject(context, functionAppPath))) {
    await addNewFileInCSharpProject(context, connectionsFileName, functionAppPath);
  }
}

async function getConnectionReference(
  referenceKey: string,
  reference: any,
  accessToken: string,
  workflowBaseManagementUri: string,
  settingsToAdd: Record<string, string>,
  parametersToAdd: any
): Promise<ConnectionReferenceModel> {
  const {
    api: { id: apiId },
    connection: { id: connectionId },
    connectionProperties,
  } = reference;
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
      settingsToAdd[appSettingKey] = response.connectionKey;

      const connectionReference: ConnectionReferenceModel = {
        api: { id: apiId },
        connection: { id: connectionId },
        connectionRuntimeUrl: response.runtimeUrls.length ? response.runtimeUrls[0] : '',
        authentication: {
          type: 'Raw',
          scheme: 'Key',
          parameter: `@appsetting('${appSettingKey}')`,
        },
        connectionProperties,
      };

      parameterizer.parameterizeConnection(connectionReference, referenceKey, parametersToAdd);

      return connectionReference;
    })
    .catch((error) => {
      throw new Error(`Error in fetching connection keys for ${connectionId}. ${error}`);
    });
}

export async function getConnectionsAndSettingsToUpdate(
  context: IActionContext,
  workflowFilePath: string,
  connectionReferences: any,
  azureTenantId: string,
  workflowBaseManagementUri: string,
  parametersFromDefinition: any
): Promise<ConnectionAndSettings> {
  const projectPath = await getFunctionProjectRoot(context, workflowFilePath);
  const connectionsDataString = projectPath ? await getConnectionsJson(projectPath) : '';
  const connectionsData = connectionsDataString === '' ? {} : JSON.parse(connectionsDataString);

  const referencesToAdd = connectionsData.managedApiConnections || {};
  const settingsToAdd: Record<string, string> = {};
  let accessToken: string | undefined;

  for (const referenceKey of Object.keys(connectionReferences)) {
    const reference = connectionReferences[referenceKey];

    if (isApiHubConnectionId(reference.connection.id) && !referencesToAdd[referenceKey]) {
      accessToken = !accessToken ? await getAuthorizationToken(/* credentials */ undefined, azureTenantId) : accessToken;
      referencesToAdd[referenceKey] = await getConnectionReference(
        referenceKey,
        reference,
        accessToken,
        workflowBaseManagementUri,
        settingsToAdd,
        parametersFromDefinition
      );
    }
  }

  connectionsData.managedApiConnections = referencesToAdd;

  return {
    connections: connectionsData,
    settings: settingsToAdd,
  };
}

export async function saveConnectionReferences(
  context: IActionContext,
  workflowFilePath: string,
  connectionAndSettingsToUpdate: ConnectionAndSettings
): Promise<void> {
  const projectPath = await getFunctionProjectRoot(context, workflowFilePath);
  const { connections, settings } = connectionAndSettingsToUpdate;
  const connectionsFilePath = path.join(projectPath, connectionsFileName);
  const connectionsFileExists = fse.pathExistsSync(connectionsFilePath);

  if (connections && Object.keys(connections).length) {
    await writeFormattedJson(connectionsFilePath, connections);
    if (!connectionsFileExists && (await isCSharpProject(context, projectPath))) {
      await addNewFileInCSharpProject(context, connectionsFileName, projectPath);
    }
  }

  if (Object.keys(settings).length) {
    await addOrUpdateLocalAppSettings(context, projectPath, settings);
  }
}

export function containsApiHubConnectionReference(references: ConnectionReferenceModel): boolean {
  for (const referenceKey of Object.keys(references)) {
    const reference = references[referenceKey];

    if (isApiHubConnectionId(reference.connection.id)) {
      return true;
    }
  }

  return false;
}

function isApiHubConnectionId(connectionId: string): boolean {
  return connectionId.startsWith('/subscriptions/');
}

export function resolveSettingsInConnection(
  connectionInfo: ServiceProviderConnectionModel,
  settings: Record<string, string>
): ServiceProviderConnectionModel {
  return connectionInfo.parameterValues
    ? {
        ...connectionInfo,
        parameterValues: Object.keys(connectionInfo.parameterValues).reduce((result: Record<string, string>, parameterKey: string) => {
          let value = connectionInfo.parameterValues[parameterKey];
          if (isString(value) && value.startsWith("@appsetting('")) {
            const settingKey = value.substring(13, value.lastIndexOf("')"));
            value = settings[settingKey];
          }

          return { ...result, [parameterKey]: value };
        }, {}),
      }
    : connectionInfo;
}

/**
 * Creates acknowledge connections to managed api connections.
 * @param {IIdentityWizardContext} identityWizardContext - Identity context.
 * @param {string} connectionId - Connection ID.
 * @param {SlotTreeItem} node - Logic app node structure.
 */
export async function createAclInConnectionIfNeeded(
  identityWizardContext: IIdentityWizardContext,
  connectionId: string,
  node: SlotTreeItem
): Promise<void> {
  if (
    (!node.site || !node.site.rawSite.identity || node.site.rawSite.identity.type !== 'SystemAssigned') &&
    !identityWizardContext?.useAdvancedIdentity
  ) {
    return;
  }

  let connectionAcls: ConnectionAcl[];
  const identity = identityWizardContext?.useAdvancedIdentity
    ? { principalId: identityWizardContext.objectId, tenantId: identityWizardContext.tenantId }
    : node.site.rawSite.identity;
  const url = `${connectionId}/accessPolicies?api-version=2018-07-01-preview`;

  try {
    const response = await sendAzureRequest(url, identityWizardContext, HTTP_METHODS.GET, node.site.subscription);
    connectionAcls = response.parsedBody.value;
  } catch (error) {
    connectionAcls = [];
  }

  if (
    !connectionAcls.some(
      (acl) =>
        acl.properties?.principal.identity.objectId === identity?.principalId &&
        acl.properties?.principal.identity.tenantId === identity?.tenantId
    )
  ) {
    return createAccessPolicyInConnection(identityWizardContext, connectionId, node, identity);
  }
}

async function createAccessPolicyInConnection(
  identityWizardContext: IIdentityWizardContext,
  connectionId: string,
  node: SlotTreeItem,
  identity: any
): Promise<void> {
  const accessToken = await getAuthorizationToken(undefined, undefined);
  const getUrl = `${connectionId}?api-version=2018-07-01-preview`;
  let connection: any;

  try {
    const response = await sendAzureRequest(getUrl, identityWizardContext, HTTP_METHODS.GET, node.site.subscription);
    connection = response.parsedBody;
  } catch (error) {
    throw new Error(`Error in getting connection - ${connectionId}. ${error}`);
  }

  const { principalId: objectId, tenantId } = identity;
  const name = `${node.site.fullName}-${objectId}`;
  const options = {
    json: true,
    headers: { authorization: accessToken },
    method: HTTP_METHODS.PUT,
    body: {
      name,
      type: 'Microsoft.Web/connections/accessPolicy',
      location: connection.location,
      properties: {
        principal: {
          type: 'ActiveDirectory',
          identity: { objectId, tenantId },
        },
      },
    },
    uri: `https://management.azure.com/${connectionId}/accessPolicies/${name}?api-version=2018-07-01-preview`,
  };

  return requestP(options).catch((error) => {
    throw new Error(`Error in creating accessPolicy - ${name} for connection - ${connectionId}. ${error}`);
  });
}

import { azurePublicBaseUrl, connectionsFileName, localSettingsFileName } from '../../../constants';
import { localize } from '../../../localize';
import { isCSharpProject } from '../../commands/initProjectForVSCode/detectProjectLanguage';
import { addOrUpdateLocalAppSettings, getLocalSettingsJson } from '../appSettings/localSettings';
import { writeFormattedJson } from '../fs';
import { sendAzureRequest } from '../requestUtils';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getContainingWorkspace } from '../workspace';
import { getWorkflowParameters } from './common';
import { getAuthorizationToken } from './getAuthorizationToken';
import { getParametersJson, saveWorkflowParameterRecords } from './parameter';
import * as parameterizer from './parameterizer';
import { addNewFileInCSharpProject } from './updateBuildFile';
import { HTTP_METHODS, isString } from '@microsoft/logic-apps-shared';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { nonNullValue } from '@microsoft/vscode-azext-utils';
import { JwtTokenHelper, JwtTokenConstants } from '../../../../../vs-code-react/src/app/designer/services/JwtHelper';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  ILocalSettingsJson,
  ServiceProviderConnectionModel,
  ConnectionAndSettings,
  ConnectionReferenceModel,
  IIdentityWizardContext,
  ConnectionAcl,
  ConnectionAndAppSetting,
  Parameter,
} from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export async function getConnectionsFromFile(context: IActionContext, workflowFilePath: string): Promise<string> {
  const projectRoot: string = await getLogicAppProjectRoot(context, workflowFilePath);
  return getConnectionsJson(projectRoot);
}

export async function getParametersFromFile(context: IActionContext, workflowFilePath: string): Promise<Record<string, Parameter>> {
  const projectRoot: string = await getLogicAppProjectRoot(context, workflowFilePath);
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
  const jsonParameters = await getParametersFromFile(context, filePath);
  const projectPath = await getLogicAppProjectRoot(context, filePath);

  await addConnectionDataInJson(context, projectPath ?? '', ConnectionAndAppSetting, jsonParameters);

  const { settings } = ConnectionAndAppSetting;
  const workflowParameterRecords = getWorkflowParameters(jsonParameters);

  await addOrUpdateLocalAppSettings(context, projectPath ?? '', settings);
  await saveWorkflowParameterRecords(context, filePath, workflowParameterRecords);

  await vscode.window.showInformationMessage(localize('azureFunctions.addConnection', 'Connection added.'));
}

export async function getLogicAppProjectRoot(context: IActionContext, workflowFilePath: string): Promise<string> {
  const workspaceFolder = nonNullValue(getContainingWorkspace(workflowFilePath), 'workspaceFolder');
  const workspacePath: string = workspaceFolder.uri.fsPath;

  const projectRoot: string | undefined = await tryGetLogicAppProjectRoot(context, workspacePath);

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

  const { connectionData, connectionKey, pathLocation, settings } = ConnectionAndAppSetting;

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

  parameterizer.parameterizeConnection(connectionData, connectionKey, parametersData, settings);

  pathToSetConnectionsData[connectionKey] = connectionData;
  await writeFormattedJson(connectionsFilePath, connectionsJson);

  if (!connectionsFileExists && (await isCSharpProject(context, functionAppPath))) {
    await addNewFileInCSharpProject(context, connectionsFileName, functionAppPath);
  }
}

function isKeyExpired(jwtTokenHelper: JwtTokenHelper, connectionKey: string, bufferInHours: number): boolean {
  const payload: Record<string, any> = jwtTokenHelper.extractJwtTokenPayload(connectionKey);
  const secondsSinceEpoch = Math.round(Date.now() / 1000);
  const buffer = bufferInHours * 3600; // convert to seconds
  const expiry = payload[JwtTokenConstants.expiry];

  return expiry - buffer <= secondsSinceEpoch;
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

  return axios
    .post(
      `${workflowBaseManagementUri}/${connectionId}/listConnectionKeys?api-version=2018-07-01-preview`,
      { validityTimeSpan: '7' },
      { headers: { authorization: accessToken } }
    )
    .then(({ data: response }) => {
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

      parameterizer.parameterizeConnection(connectionReference, referenceKey, parametersToAdd, settingsToAdd);

      return connectionReference;
    })
    .catch((error) => {
      throw new Error(`Error in fetching connection keys for ${connectionId}. ${error}`);
    });
}

//change workflow file path to project root

export async function getConnectionsAndSettingsToUpdate(
  context: IActionContext,
  projectPath: string,
  connectionReferences: any,
  azureTenantId: string,
  workflowBaseManagementUri: string,
  parametersFromDefinition: any
): Promise<ConnectionAndSettings> {
  const connectionsDataString = projectPath ? await getConnectionsJson(projectPath) : '';
  const connectionsData = connectionsDataString === '' ? {} : JSON.parse(connectionsDataString);
  const localSettingsPath: string = path.join(projectPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

  const referencesToAdd = connectionsData.managedApiConnections || {};
  const settingsToAdd: Record<string, string> = {};
  const jwtTokenHelper: JwtTokenHelper = JwtTokenHelper.createInstance();
  let accessToken: string | undefined;

  for (const referenceKey of Object.keys(connectionReferences)) {
    const reference = connectionReferences[referenceKey];

    if (isApiHubConnectionId(reference.connection.id) && !referencesToAdd[referenceKey]) {
      accessToken = accessToken ? accessToken : await getAuthorizationToken(/* credentials */ undefined, azureTenantId);
      referencesToAdd[referenceKey] = await getConnectionReference(
        referenceKey,
        reference,
        accessToken,
        workflowBaseManagementUri,
        settingsToAdd,
        parametersFromDefinition
      );
    } else if (
      settings.Values[`${referenceKey}-connectionKey`] &&
      isKeyExpired(jwtTokenHelper, settings.Values[`${referenceKey}-connectionKey`], 192)
    ) {
      accessToken = accessToken ? accessToken : await getAuthorizationToken(/* credentials */ undefined, azureTenantId);
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
  projectPath: string,
  connectionAndSettingsToUpdate: ConnectionAndSettings
): Promise<void> {
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

          result[parameterKey] = value;
          return result;
        }, {}),
      }
    : connectionInfo;
}

/**
 * Creates acknowledge connections to managed api connections.
 * @param {IIdentityWizardContext} identityWizardContext - Identity context.
 * @param {string} connectionId - Connection ID.
 * @param {ParsedSite} site - Logic app site.
 */
export async function createAclInConnectionIfNeeded(
  identityWizardContext: IIdentityWizardContext,
  connectionId: string,
  site: ParsedSite
): Promise<void> {
  if ((!site || !site.rawSite.identity || site.rawSite.identity.type !== 'SystemAssigned') && !identityWizardContext?.useAdvancedIdentity) {
    return;
  }

  let connectionAcls: ConnectionAcl[];
  const identity = identityWizardContext?.useAdvancedIdentity
    ? { principalId: identityWizardContext.objectId, tenantId: identityWizardContext.tenantId }
    : site.rawSite.identity;
  const url = `${connectionId}/accessPolicies?api-version=2018-07-01-preview`;

  try {
    const response = await sendAzureRequest(url, identityWizardContext, HTTP_METHODS.GET, site.subscription);
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
    return createAccessPolicyInConnection(identityWizardContext, connectionId, site, identity);
  }
}

async function createAccessPolicyInConnection(
  identityWizardContext: IIdentityWizardContext,
  connectionId: string,
  site: ParsedSite,
  identity: any
): Promise<void> {
  const accessToken = await getAuthorizationToken(undefined, undefined);
  const getUrl = `${connectionId}?api-version=2018-07-01-preview`;
  let connection: any;

  try {
    const response = await sendAzureRequest(getUrl, identityWizardContext, HTTP_METHODS.GET, site.subscription);
    connection = response.parsedBody;
  } catch (error) {
    throw new Error(`Error in getting connection - ${connectionId}. ${error}`);
  }

  const { principalId: objectId, tenantId } = identity;
  const name = `${site.fullName}-${objectId}`;
  const options = {
    headers: { authorization: accessToken },
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
    uri: `${azurePublicBaseUrl}/${connectionId}/accessPolicies/${name}?api-version=2018-07-01-preview`,
  };

  return axios
    .put(options.uri, options.body, {
      headers: options.headers,
    })
    .then(({ data }) => data)
    .catch((error) => {
      throw new Error(`Error in creating accessPolicy - ${name} for connection - ${connectionId}. ${error}`);
    });
}

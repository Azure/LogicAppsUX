import {
  azurePublicBaseUrl,
  connectionsFileName,
  localSettingsFileName,
  parameterizeConnectionsInProjectLoadSetting,
} from '../../../constants';
import { localize } from '../../../localize';
import { isCSharpProject } from '../detectProjectLanguage';
import { addOrUpdateLocalAppSettings, getLocalSettingsJson } from '../appSettings/localSettings';
import { writeFormattedJson } from '../fs';
import { sendAzureRequest } from '../requestUtils';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getContainingWorkspace } from '../workspace';
import { createJsonFileIfDoesNotExist, getWorkflowParameters } from './common';
import { getAuthorizationToken, getAuthorizationTokenFromNode } from './getAuthorizationToken';
import { getParametersJson, saveWorkflowParameterRecords } from './parameter';
import { deleteCustomCode, getCustomCode, getCustomCodeAppFilesToUpdate, uploadCustomCode } from './customcode';
import { addNewFileInCSharpProject } from './updateBuildFile';
import type { ConnectionAndAppSetting } from '@microsoft/logic-apps-shared';
import { HTTP_METHODS, isString, resolveConnectionsReferences } from '@microsoft/logic-apps-shared';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { nonNullValue } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  ILocalSettingsJson,
  ServiceProviderConnectionModel,
  ConnectionAndSettings,
  ConnectionReferenceModel,
  IIdentityWizardContext,
  ConnectionAcl,
  Parameter,
  CustomCodeFileNameMapping,
  AllCustomCodeFiles,
} from '@microsoft/vscode-extension-logic-apps';
import { JwtTokenHelper, JwtTokenConstants } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { parameterizeConnection } from './parameterizer';
import { window } from 'vscode';
import { getGlobalSetting } from '../vsCodeConfig/settings';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { ext } from '../../../extensionVariables';

export async function getConnectionsFromFile(context: IActionContext, workflowFilePath: string): Promise<string> {
  const projectRoot: string = await getLogicAppProjectRoot(context, workflowFilePath);
  return getConnectionsJson(projectRoot);
}

export async function getParametersFromFile(context: IActionContext, workflowFilePath: string): Promise<Record<string, Parameter>> {
  const projectRoot: string = await getLogicAppProjectRoot(context, workflowFilePath);
  return getParametersJson(projectRoot);
}

async function getCustomCodeAppFiles(
  context: IActionContext,
  workflowFilePath: string,
  customCode: CustomCodeFileNameMapping
): Promise<Record<string, string>> {
  const projectRoot: string = await getLogicAppProjectRoot(context, workflowFilePath);
  return getCustomCodeAppFilesToUpdate(projectRoot, customCode);
}

export async function getCustomCodeFromFiles(workflowFilePath: string): Promise<Record<string, string>> {
  const workspaceFolder = path.dirname(workflowFilePath);
  return getCustomCode(workspaceFolder);
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
  connectionAndAppSetting: ConnectionAndAppSetting<any>
): Promise<void> {
  const jsonParameters = await getParametersFromFile(context, filePath);
  const projectPath = await getLogicAppProjectRoot(context, filePath);

  await addConnectionDataInJson(context, projectPath ?? '', connectionAndAppSetting, jsonParameters);

  const { settings } = connectionAndAppSetting;
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
  connectionAndAppSetting: ConnectionAndAppSetting<any>,
  parametersData: Record<string, Parameter>
): Promise<void> {
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);
  const connectionsFilePath = path.join(functionAppPath, connectionsFileName);
  const connectionsFileExists = fse.pathExistsSync(connectionsFilePath);

  const connectionsJsonString = await getConnectionsJson(functionAppPath);
  const connectionsJson = connectionsJsonString === '' ? {} : JSON.parse(connectionsJsonString);

  const { connectionData, connectionKey, pathLocation, settings } = connectionAndAppSetting;

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

  if (parameterizeConnectionsSetting) {
    parameterizeConnection(connectionData, connectionKey, parametersData, settings);
  }

  pathToSetConnectionsData[connectionKey] = connectionData;
  await writeFormattedJson(connectionsFilePath, connectionsJson);

  if (!connectionsFileExists && (await isCSharpProject(context, functionAppPath))) {
    await addNewFileInCSharpProject(context, connectionsFileName, functionAppPath);
  }
}

export function isKeyExpired(jwtTokenHelper: JwtTokenHelper, date: number, connectionKey: string, bufferInHours: number): boolean {
  const payload: Record<string, any> = jwtTokenHelper.extractJwtTokenPayload(connectionKey);
  const secondsSinceEpoch = date / 1000;
  const buffer = bufferInHours * 3600; // convert to seconds
  const expiry = payload[JwtTokenConstants.expiry];

  return expiry - buffer <= secondsSinceEpoch;
}

function formatSetting(setting: string): string {
  if (setting.endsWith('/')) {
    setting = setting.substring(0, setting.length - 1);
  }
  if (setting.startsWith('/')) {
    setting = setting.substring(1);
  }
  return setting;
}

async function getConnectionReference(
  context: IActionContext,
  referenceKey: string,
  reference: any,
  accessToken: string,
  workflowBaseManagementUri: string,
  settingsToAdd: Record<string, string>,
  parametersToAdd: any,
  parameterizeConnectionsSetting: any
): Promise<ConnectionReferenceModel> {
  const {
    api: { id: apiId },
    connection: { id: connectionId },
    connectionProperties,
  } = reference;

  const useMsi = ext.useMSI;

  return axios
    .post(
      `${formatSetting(workflowBaseManagementUri)}/${formatSetting(connectionId)}/listConnectionKeys?api-version=2018-07-01-preview`,
      { validityTimeSpan: '7' },
      { headers: { authorization: accessToken } }
    )
    .then(({ data: response }) => {
      // Only add connection key to settings if NOT using MSI
      if (!useMsi) {
        const appSettingKey = `${referenceKey}-connectionKey`;
        settingsToAdd[appSettingKey] = response.connectionKey;
      }

      // Determine authentication based on ext.useMSI
      const authValue = useMsi
        ? { type: 'ManagedServiceIdentity' }
        : {
            type: 'Raw',
            scheme: 'Key',
            parameter: `@appsetting('${referenceKey}-connectionKey')`,
          };

      const connectionReference: ConnectionReferenceModel = {
        api: { id: apiId },
        connection: { id: connectionId },
        connectionRuntimeUrl: response.runtimeUrls.length ? response.runtimeUrls[0] : '',
        authentication: authValue,
        connectionProperties,
      };

      return parameterizeConnectionsSetting
        ? (parameterizeConnection(connectionReference, referenceKey, parametersToAdd, settingsToAdd) as ConnectionReferenceModel)
        : connectionReference;
    })
    .catch((error) => {
      context.telemetry.properties.connectionKeyFailure = `Error fetching ${referenceKey}-connectionKey`;
      throw new Error(`Error in fetching connection keys for ${connectionId}. ${error}`);
    });
}

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
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);
  let areKeysRefreshed = false;
  let areKeysGenerated = false;

  const referencesToAdd = connectionsData.managedApiConnections || {};
  const settingsToAdd: Record<string, string> = {};
  const jwtTokenHelper: JwtTokenHelper = JwtTokenHelper.createInstance();
  let accessToken: string | undefined;
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

  for (const referenceKey of Object.keys(connectionReferences)) {
    const reference = connectionReferences[referenceKey];

    context.telemetry.properties.checkingConnectionKey = `Checking ${referenceKey}-connectionKey validity`;
    if (isApiHubConnectionId(reference.connection.id) && !referencesToAdd[referenceKey]) {
      accessToken = accessToken ? accessToken : await getAuthorizationToken(azureTenantId);
      referencesToAdd[referenceKey] = await getConnectionReference(
        context,
        referenceKey,
        reference,
        accessToken,
        workflowBaseManagementUri,
        settingsToAdd,
        parametersFromDefinition,
        parameterizeConnectionsSetting
      );

      context.telemetry.properties.connectionKeyGenerated = ext.useMSI
        ? `${referenceKey} configured for MSI authentication`
        : `${referenceKey}-connectionKey generated and is valid for 7 days`;

      if (!ext.useMSI) {
        areKeysGenerated = true;
      }
    } else if (!ext.useMSI && isApiHubConnectionId(reference.connection.id) && !localSettings.Values[`${referenceKey}-connectionKey`]) {
      const resolvedConnectionReference = resolveConnectionsReferences(JSON.stringify(reference), undefined, localSettings.Values);

      accessToken = accessToken ? accessToken : await getAuthorizationToken(azureTenantId);

      // call api to get connection key but will not modify connections file
      await getConnectionReference(
        context,
        referenceKey,
        resolvedConnectionReference,
        accessToken,
        workflowBaseManagementUri,
        settingsToAdd,
        parametersFromDefinition,
        parameterizeConnectionsSetting
      );

      context.telemetry.properties.connectionKeyGenerated = `${referenceKey}-connectionKey generated and is valid for 7 days`;
      areKeysGenerated = true;
    } else if (
      !ext.useMSI &&
      isApiHubConnectionId(reference.connection.id) &&
      localSettings.Values[`${referenceKey}-connectionKey`] &&
      isKeyExpired(jwtTokenHelper, Date.now(), localSettings.Values[`${referenceKey}-connectionKey`], 3)
    ) {
      const resolvedConnectionReference = resolveConnectionsReferences(JSON.stringify(reference), undefined, localSettings.Values);

      accessToken = accessToken ? accessToken : await getAuthorizationToken(azureTenantId);

      // call api to get connection key but will not modify connections file
      await getConnectionReference(
        context,
        referenceKey,
        resolvedConnectionReference,
        accessToken,
        workflowBaseManagementUri,
        settingsToAdd,
        parametersFromDefinition,
        parameterizeConnectionsSetting
      );

      context.telemetry.properties.connectionKeyRegenerate = `${referenceKey}-connectionKey regenerated and is valid for 7 days`;
      areKeysRefreshed = true;
    } else {
      context.telemetry.properties.connectionKeyValid = `${referenceKey}-connectionKey exists and is valid`;
    }
  }

  // Update MSI connection permissions if MSI is enabled
  if (ext.useMSI) {
    try {
      const updatedReferences = await updateConnectionReferencesLocalMSI(
        context,
        referencesToAdd,
        azureTenantId,
        workflowBaseManagementUri,
        localSettings
      );
      Object.assign(referencesToAdd, updatedReferences);
      context.telemetry.properties.msiPermissionsUpdated = 'MSI access policies configured successfully';
    } catch (error) {
      context.telemetry.properties.msiPermissionsError = `Failed to update MSI permissions: ${error}`;
      window.showErrorMessage(
        localize('msiPermissionError', 'Failed to configure MSI permissions for connections. Please check your access rights.')
      );
    }
  }

  connectionsData.managedApiConnections = referencesToAdd;

  if (areKeysRefreshed) {
    window.showInformationMessage(localize('connectionKeysRefreshed', 'Connection keys have been refreshed and are valid for 7 days.'));
  }

  if (areKeysGenerated) {
    window.showInformationMessage(localize('connectionKeysGenerated', 'New connection keys have been generated and are valid for 7 days.'));
  }

  return {
    connections: connectionsData,
    settings: settingsToAdd,
  };
}

export async function getCustomCodeToUpdate(
  context: IActionContext,
  filePath: string,
  customCode: CustomCodeFileNameMapping
): Promise<AllCustomCodeFiles | undefined> {
  const filteredCustomCodeMapping: CustomCodeFileNameMapping = {};
  const originalCustomCodeData = Object.keys(await getCustomCodeFromFiles(filePath));
  if (!customCode || Object.keys(customCode).length === 0) {
    return;
  }

  const appFiles = await getCustomCodeAppFiles(context, filePath, customCode);
  Object.entries(customCode).forEach(([fileName, customCodeData]) => {
    const { isModified, isDeleted } = customCodeData;
    if ((isDeleted && originalCustomCodeData.includes(fileName)) || (isModified && !isDeleted)) {
      filteredCustomCodeMapping[fileName] = { ...customCodeData };
    }
  });
  return { customCodeFiles: filteredCustomCodeMapping, appFiles };
}

export async function saveCustomCodeStandard(filePath: string, allCustomCodeFiles?: AllCustomCodeFiles): Promise<void> {
  const { customCodeFiles: customCode, appFiles } = allCustomCodeFiles ?? {};
  if (!customCode || Object.keys(customCode).length === 0) {
    return;
  }
  try {
    const projectPath = await getLogicAppProjectRoot(this.context, filePath);
    const workspaceFolder = path.dirname(filePath);
    // to prevent 404's we first check which custom code files are already present before deleting
    Object.entries(customCode).forEach(([fileName, customCodeData]) => {
      const { isModified, isDeleted, fileData } = customCodeData;
      if (isDeleted) {
        deleteCustomCode(workspaceFolder, fileName);
      } else if (isModified && fileData) {
        uploadCustomCode(workspaceFolder, fileName, fileData);
      }
    });
    // upload the app files needed for powershell actions
    Object.entries(appFiles ?? {}).forEach(([fileName, fileData]) => uploadCustomCode(projectPath, fileName, fileData));
  } catch (error) {
    const errorMessage = `Failed to save custom code: ${error}`;
    throw new Error(errorMessage);
  }
}

export async function createConnectionsJson(projectPath: string): Promise<void> {
  await createJsonFileIfDoesNotExist(projectPath, connectionsFileName);
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
 * @param {SlotTreeItem} node - The Logic App node.
 */
export async function createAclInConnectionIfNeeded(
  identityWizardContext: IIdentityWizardContext,
  connectionId: string,
  node: SlotTreeItem
): Promise<void> {
  const site = node.site;
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
  } catch (_error) {
    connectionAcls = [];
  }

  if (
    !connectionAcls.some(
      (acl) =>
        acl.properties?.principal.identity.objectId === identity?.principalId &&
        acl.properties?.principal.identity.tenantId === identity?.tenantId
    )
  ) {
    const accessToken = await getAuthorizationTokenFromNode(node);
    return createAccessPolicyInConnection(identityWizardContext, connectionId, site, identity, accessToken);
  }
}

async function createAccessPolicyInConnection(
  identityWizardContext: IIdentityWizardContext,
  connectionId: string,
  site: ParsedSite,
  identity: any,
  accessToken: string
): Promise<void> {
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

async function updateConnectionReferencesLocalMSI(
  context: IActionContext,
  connectionReferences: Record<string, ConnectionReferenceModel>,
  azureTenantId: string,
  workflowBaseManagementUri: string,
  localSettings: ILocalSettingsJson
): Promise<Record<string, ConnectionReferenceModel>> {
  const startTime = Date.now();
  context.telemetry.properties.msiConnectionsCount = Object.keys(connectionReferences).length.toString();

  let accessToken: string;
  try {
    accessToken = await getAuthorizationToken(azureTenantId);
  } catch (error) {
    context.telemetry.properties.msiTokenError = `Failed to get access token: ${error.message}`;
    throw new Error(localize('msiTokenError', 'Failed to retrieve access token for MSI configuration'));
  }

  const jwtHelper = JwtTokenHelper.createInstance();
  const tokenPayload = jwtHelper.extractJwtTokenPayload(accessToken);
  const objectId = tokenPayload?.oid || tokenPayload?.sub;
  const tenantId = tokenPayload?.tid || azureTenantId;

  if (!objectId || !tenantId) {
    context.telemetry.properties.msiIdentityError = 'Missing objectId or tenantId in token';
    throw new Error(localize('msiIdentityError', 'Unable to retrieve user identity from access token'));
  }

  context.telemetry.properties.msiObjectId = objectId;
  context.telemetry.properties.msiTenantId = tenantId;

  const updatedReferences: Record<string, ConnectionReferenceModel> = {};
  const errors: Array<{ referenceKey: string; error: string }> = [];
  let successCount = 0;

  for (const [referenceKey, reference] of Object.entries(connectionReferences)) {
    const connectionStartTime = Date.now();

    try {
      const connectionId = reference.connection.id;

      if (!isApiHubConnectionId(connectionId)) {
        context.telemetry.properties[`msiSkipped_${referenceKey}`] = 'Not an API Hub connection';
        updatedReferences[referenceKey] = reference;
        continue;
      }

      context.telemetry.properties[`msiProcessing_${referenceKey}`] = connectionId;

      await ensureAccessPolicy(connectionId, objectId, tenantId, accessToken, workflowBaseManagementUri, localSettings);
      successCount++;
      context.telemetry.properties[`msiSuccess_${referenceKey}`] = `Completed in ${Date.now() - connectionStartTime}ms`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ referenceKey, error: errorMessage });

      context.telemetry.properties[`msiError_${referenceKey}`] = errorMessage;

      // Still include the reference but with original authentication
      updatedReferences[referenceKey] = reference;

      ext.outputChannel.appendLog(
        localize('msiConnectionError', 'Failed to configure MSI for connection {0}: {1}', referenceKey, errorMessage)
      );
    }
  }

  // Summary telemetry
  context.telemetry.properties.msiSuccessCount = successCount.toString();
  context.telemetry.properties.msiErrorCount = errors.length.toString();
  context.telemetry.properties.msiTotalDuration = `${Date.now() - startTime}ms`;

  if (errors.length > 0) {
    const errorSummary = errors.map((e) => e.referenceKey).join(', ');
    context.telemetry.properties.msiFailedConnections = errorSummary;

    // Show warning but don't throw - partial success is acceptable
    window.showWarningMessage(
      localize('msiPartialSuccess', 'MSI configuration partially succeeded. Failed for connections: {0}', errorSummary)
    );
  }

  return updatedReferences;
}

async function ensureAccessPolicy(
  connectionId: string,
  objectId: string,
  tenantId: string,
  accessToken: string,
  baseManagementUri: string,
  localSettings: ILocalSettingsJson
): Promise<void> {
  const subscriptionId = localSettings.Values['WORKFLOWS_SUBSCRIPTION_ID'];
  const resourceGroup = localSettings.Values['WORKFLOWS_RESOURCE_GROUP_NAME'];

  if (!subscriptionId || !resourceGroup) {
    ext.outputChannel.appendLog(
      localize('missingSettings', 'Missing required settings: WORKFLOWS_SUBSCRIPTION_ID or WORKFLOWS_RESOURCE_GROUP_NAME')
    );
    throw new Error('Missing WORKFLOWS_SUBSCRIPTION_ID or WORKFLOWS_RESOURCE_GROUP_NAME in local settings');
  }

  // Resolve connection ID with app settings
  const resolvedConnectionId = connectionId.includes('@{appsetting(')
    ? connectionId
        .replace("@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}", subscriptionId)
        .replace("@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}", resourceGroup)
    : connectionId;

  ext.outputChannel.appendLog(localize('resolvingConnection', 'Resolving connection ID: {0} -> {1}', connectionId, resolvedConnectionId));

  const policiesUrl = `${formatSetting(baseManagementUri)}${resolvedConnectionId}/accessPolicies?api-version=2018-07-01-preview`;

  // Check if policy already exists
  try {
    const response = await axios.get(policiesUrl, {
      headers: { authorization: accessToken },
    });

    const policies = response.data.value || [];
    const policyExists = policies.some(
      (p: any) => p.properties?.principal?.identity?.objectId === objectId && p.properties?.principal?.identity?.tenantId === tenantId
    );

    if (policyExists) {
      ext.outputChannel.appendLog(localize('policyExists', 'Access policy already exists for objectId: {0}', objectId));
      return; // Policy already exists, no need to create
    }
  } catch (error) {
    // If 404, policies don't exist - continue to create
    if (error.response?.status !== 404) {
      ext.outputChannel.appendLog(localize('errorCheckingPolicies', 'Error checking existing policies: {0}', error.message));
    }
  }

  // Create access policy
  const policyName = objectId; // Using objectId as the policy name
  const apiVersion = '2016-06-01';
  const policyUrl = `${formatSetting(baseManagementUri)}${resolvedConnectionId}/accessPolicies/${encodeURIComponent(policyName)}?api-version=${apiVersion}`;

  try {
    await axios.put(
      policyUrl,
      {
        properties: {
          principal: {
            type: 'ActiveDirectory',
            identity: { objectId, tenantId },
          },
        },
      },
      {
        headers: {
          Authorization: accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    ext.outputChannel.appendLog(localize('policyCreated', 'Successfully created access policy for objectId: {0}', objectId));
  } catch (error) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    ext.outputChannel.appendLog(localize('policyCreationFailed', 'Failed to create access policy: {0}', errorDetails));
  }
}

import type {
  ParametersData,
  ConnectionsData,
  IFunctionWizardContext,
  AzureConnectorDetails,
} from '@microsoft/vscode-extension-logic-apps';
import { getAzureConnectorDetailsForLocalProject } from '../../utils/codeless/common';
import { getConnectionsAndSettingsToUpdate, getConnectionsJson, saveConnectionReferences } from '../../utils/codeless/connection';
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getParametersJson } from '../../utils/codeless/parameter';
import { areAllConnectionsParameterized, parameterizeConnection } from '../../utils/codeless/parameterizer';
import * as path from 'path';
import * as fs from 'fs';
import { isCSharpProject } from '../initProjectForVSCode/detectProjectLanguage';
import { azureWebJobsStorageKey, parametersFileName } from '../../../constants';
import { addNewFileInCSharpProject } from '../../utils/codeless/updateBuildFile';
import { writeFormattedJson } from '../../utils/fs';
import { window } from 'vscode';

export async function extractConnectionDetails(connections: any): Promise<any> {
  const SUBSCRIPTION_INDEX = 2;
  const MANAGED_API_LOCATION_INDEX = 6;
  const MANAGED_CONNECTION_RESOURCE_GROUP_INDEX = 4;

  const details = [];
  const managedApiConnections = connections['managedApiConnections'];
  if (managedApiConnections) {
    for (const connKey in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connKey)) {
        const api = managedApiConnections[connKey]['api'];
        const connection = managedApiConnections[connKey]['connection'];
        if (api?.id && connection?.id) {
          const idPath = api['id'];
          const connectionIdPath = connection['id'];
          const apiIdParts = idPath.split('/');
          const connectionIdParts = connectionIdPath.split('/');
          if (apiIdParts) {
            const detail = {
              WORKFLOWS_SUBSCRIPTION_ID: apiIdParts[SUBSCRIPTION_INDEX],
              WORKFLOWS_LOCATION_NAME: apiIdParts[MANAGED_API_LOCATION_INDEX],
              WORKFLOWS_RESOURCE_GROUP_NAME: connectionIdParts[MANAGED_CONNECTION_RESOURCE_GROUP_INDEX],
            };
            details.push(detail);
          }
        }
      }
    }
    return details;
  }
}

export async function extractConnectionSettings(context: IFunctionWizardContext): Promise<Record<string, any>> {
  const logicAppPath = path.join(context.customWorkspaceFolderPath, context.logicAppName || 'LogicApp');
  const localSettingsPath = path.join(logicAppPath, 'local.settings.json');

  if (logicAppPath) {
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
      if (isEmptyString(connectionsJson)) {
        return;
      }
      const connectionsData = JSON.parse(connectionsJson);

      const connectionsValues = await extractConnectionDetails(connectionsData);
      const connectionDetail = connectionsValues[0];

      context.telemetry.properties.addedConnectionDetails = `Extracted the following settings: ${connectionDetail}`;
      const newValues = {
        ...connectionDetail,
        ...localSettings.Values,
      };
      const settings = {
        ...localSettings,
        Values: newValues,
      };

      return settings;
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error('Error encountered while extracting connection details:', error);
    }
  }
}

export async function getParametersArtifactData(projectRoot: string): Promise<string> {
  const connectionFilePath: string = path.join(projectRoot, parametersFileName);
  if (await fs.existsSync(connectionFilePath)) {
    const data: string = (await fs.readFileSync(connectionFilePath, 'utf-8')).toString();
    if (/[^\s]/.test(data)) {
      return data;
    }
  }

  return '';
}

export async function changeAuthTypeToRaw(context: IFunctionWizardContext, parameterizeConnectionsSetting: any): Promise<any> {
  const logicAppPath = path.join(context.customWorkspaceFolderPath, context.logicAppName || 'LogicApp');
  const connectionsPath = path.join(logicAppPath, 'connections.json');
  const parametersPath = path.join(logicAppPath, 'parameters.json');
  let connectionsData: ConnectionsData = {};
  let parametersJson: ParametersData = {};

  if (logicAppPath) {
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      if (isEmptyString(connectionsJson)) {
        return;
      }
      connectionsData = JSON.parse(connectionsJson);
      parametersJson = await getParametersJson(logicAppPath);
      if (parameterizeConnectionsSetting) {
        for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
          parametersJson[`${referenceKey}-Authentication`].value = {
            type: 'Raw',
            scheme: 'Key',
            parameter: `@appsetting('${referenceKey}-connectionKey')`,
          };
          context.telemetry.properties.convertParamToRaw = `Converted ${referenceKey}-Authentication parameter to Raw`;
        }
      } else {
        for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
          const authentication: string | any = connectionsData.managedApiConnections[referenceKey].authentication;
          if (typeof authentication === 'string') {
            if (authentication.includes('@parameters(') || authentication.includes('@{parameters(')) {
              parametersJson[`${referenceKey}-Authentication`].value = {
                type: 'Raw',
                scheme: 'Key',
                parameter: `@appsetting('${referenceKey}-connectionKey')`,
              };
              context.telemetry.properties.convertParamToRaw = `Converted ${referenceKey}-Authentication parameter to Raw`;
            }
          } else {
            connectionsData.managedApiConnections[referenceKey].authentication = {
              type: 'Raw',
              scheme: 'Key',
              parameter: `@appsetting('${referenceKey}-connectionKey')`,
            };
            context.telemetry.properties.convertAuthInConnectionToRaw = `Converted ${referenceKey} connection authentication to Raw`;
          }
        }
      }
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error(error);
    }
    await writeFormattedJson(connectionsPath, connectionsData);
    if (Object.keys(parametersJson).length) {
      await writeFormattedJson(parametersPath, parametersJson);
    }
  }
}

export async function updateConnectionKeys(context: IFunctionWizardContext): Promise<void> {
  let azureDetails: AzureConnectorDetails;
  const logicAppPath = path.join(context.customWorkspaceFolderPath, context.logicAppName || 'LogicApp');

  if (logicAppPath) {
    azureDetails = await getAzureConnectorDetailsForLocalProject(context, logicAppPath);
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      if (isEmptyString(connectionsJson)) {
        ext.outputChannel.appendLog(localize('noConnectionKeysFound', 'No connection keys found for validation'));
        return;
      }
      const parametersData = getParametersJson(logicAppPath);
      const connectionsData: ConnectionsData = JSON.parse(connectionsJson);

      if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
        const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
          context,
          logicAppPath,
          connectionsData.managedApiConnections,
          azureDetails.tenantId,
          azureDetails.workflowManagementBaseUrl,
          parametersData
        );

        await saveConnectionReferences(context, logicAppPath, connectionsAndSettingsToUpdate);
      }
    } catch (error) {
      const errorMessage = localize(
        'errorVerifyingConnectionKeys',
        'Error encountered while verifying existing managed API connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

export async function parameterizeConnectionsDuringImport(
  context: IFunctionWizardContext,
  localSettingsValues: Record<string, string>
): Promise<void> {
  const logicAppPath = path.join(context.customWorkspaceFolderPath, context.logicAppName || 'LogicApp');
  const parametersFilePath = path.join(logicAppPath, parametersFileName);
  const parametersFileExists = fs.existsSync(parametersFilePath);

  if (logicAppPath) {
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      if (isEmptyString(connectionsJson)) {
        return;
      }
      const connectionsData = JSON.parse(connectionsJson);
      const parametersJson = await getParametersJson(logicAppPath);

      if (areAllConnectionsParameterized(connectionsData)) {
        window.showInformationMessage(localize('connectionsAlreadyParameterized', 'Connections are already parameterized.'));
        return;
      }

      Object.keys(connectionsData).forEach((connectionType) => {
        if (connectionType !== 'serviceProviderConnections') {
          const connectionTypeJson = connectionsData[connectionType];
          Object.keys(connectionTypeJson).forEach((connectionKey) => {
            connectionTypeJson[connectionKey] = parameterizeConnection(
              connectionTypeJson[connectionKey],
              connectionKey,
              parametersJson,
              localSettingsValues
            );

            context.telemetry.properties.parameterizedConnections = `Parameterized ${connectionKey} connection.`;
          });
        }
      });

      if (parametersJson && Object.keys(parametersJson).length) {
        await writeFormattedJson(parametersFilePath, parametersJson);
        if (!parametersFileExists && (await isCSharpProject(context, logicAppPath))) {
          await addNewFileInCSharpProject(context, parametersFileName, logicAppPath);
        }
      } else if (parametersFileExists) {
        await writeFormattedJson(parametersFilePath, parametersJson);
      }

      await saveConnectionReferences(context, logicAppPath, { connections: connectionsData, settings: localSettingsValues });
    } catch (error) {
      const errorMessage = localize(
        'errorParameterizeConnections',
        'Error encountered while parameterizing existing connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

export async function cleanLocalSettings(context: IFunctionWizardContext): Promise<void> {
  const logicAppPath = path.join(context.customWorkspaceFolderPath, context.logicAppName || 'LogicApp');
  const localSettingsPath = path.join(logicAppPath, 'local.settings.json');
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));

  if (localSettings.Values) {
    Object.keys(localSettings.Values).forEach((key) => {
      if (key.startsWith('WEBSITE_') || key === 'ScmType' || key.startsWith('FUNCTIONS_RUNTIME')) {
        delete localSettings.Values[key];
        context.telemetry.properties.removedSetting = `Removing ${key} from local settings`;
      } else if (key === azureWebJobsStorageKey) {
        localSettings.Values[azureWebJobsStorageKey] = 'UseDevelopmentStorage=true';
        context.telemetry.properties.removedSetting = 'Changed AzureWebJobsStorage to UseDevelopmentStorage=true';
      }
    });

    await writeFormattedJson(localSettingsPath, localSettings);
  }
}

export function mergeAppSettings(targetSettings: Record<string, any>, sourceSettings: Record<string, any>): Record<string, any> {
  const newValues = Object.assign({}, targetSettings.Values, sourceSettings.Values);
  return { IsEncrypted: targetSettings.IsEncrypted, Values: newValues };
}

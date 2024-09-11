import type {
  ParametersData,
  ConnectionsData,
  IFunctionWizardContext,
  AzureConnectorDetails,
} from '@microsoft/vscode-extension-logic-apps';
import { getAzureConnectorDetailsForLocalProject } from '../../utils/codeless/common';
import { getConnectionsAndSettingsToUpdate, getConnectionsJson, saveConnectionReferences } from '../../utils/codeless/connection';
import { isEmptyString } from '@microsoft/logic-apps-shared/src/utils/src/lib/helpers/functions';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getParametersJson, saveWorkflowParameter } from '../../utils/codeless/parameter';
import { parameterizeConnection } from '../../utils/codeless/parameterizer';

export function extractConnectionDetails(connections: ConnectionsData): any {
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

export async function changeAuthTypeToRaw(
  connections: ConnectionsData,
  parameters: ParametersData | undefined,
  parameterizeConnectionsSetting: any
): Promise<any> {
  if (connections.managedApiConnections && Object.keys(connections.managedApiConnections).length) {
    try {
      if (parameterizeConnectionsSetting === null || parameterizeConnectionsSetting) {
        for (const referenceKey of Object.keys(connections.managedApiConnections)) {
          parameters[`${referenceKey}-Authentication`].value = {
            type: 'Raw',
            scheme: 'Key',
            parameter: `@appsetting('${referenceKey}-connectionKey')`,
          };
        }
      } else {
        for (const referenceKey of Object.keys(connections.managedApiConnections)) {
          const authentication: string | any = connections.managedApiConnections[referenceKey].authentication;
          if (typeof authentication === 'string') {
            if (authentication.includes('@parameters(') || authentication.includes('@{parameters(')) {
              parameters[`${referenceKey}-Authentication`].value = {
                type: 'Raw',
                scheme: 'Key',
                parameter: `@appsetting('${referenceKey}-connectionKey')`,
              };
            }
          } else {
            connections.managedApiConnections[referenceKey].authentication = {
              type: 'Raw',
              scheme: 'Key',
              parameter: `@appsetting('${referenceKey}-connectionKey')`,
            };
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return [connections, parameters];
  }
}

export async function updateConnectionKeys(context: IFunctionWizardContext): Promise<void> {
  let azureDetails: AzureConnectorDetails;
  const projectPath = context.projectPath;

  if (projectPath) {
    azureDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);
    try {
      const connectionsJson = await getConnectionsJson(projectPath);
      if (isEmptyString(connectionsJson)) {
        ext.outputChannel.appendLog(localize('noConnectionKeysFound', 'No connection keys found to verify'));
        return;
      }
      const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
      const parametersData = getParametersJson(projectPath);
      const managedApiConnectionReferences = connectionsData.managedApiConnections;

      if (connectionsData.managedApiConnections && !(Object.keys(managedApiConnectionReferences).length === 0)) {
        const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
          context,
          projectPath,
          managedApiConnectionReferences,
          azureDetails.tenantId,
          azureDetails.workflowManagementBaseUrl,
          parametersData
        );

        await saveConnectionReferences(this.context, projectPath, connectionsAndSettingsToUpdate);
      }
    } catch (error) {
      const errorMessage = localize(
        'errorVerifyingConnectionKeys',
        'Error while verifying existing managed api connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

export async function parameterizeConnections(context: IFunctionWizardContext, localSettingsJson: Record<string, any>): Promise<void> {
  const projectPath = context.projectPath;

  if (projectPath) {
    try {
      const connectionsJson = await getConnectionsJson(projectPath);
      if (isEmptyString(connectionsJson)) {
        return;
      }
      const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
      const parametersJson = await getParametersJson(projectPath);

      Object.keys(connectionsData).forEach((connectionType) => {
        if (connectionType !== 'serviceProviderConnections') {
          const connectionTypeJson = connectionsData[connectionType];
          Object.keys(connectionTypeJson).forEach((connectionKey) => {
            connectionTypeJson[connectionKey] = parameterizeConnection(
              connectionTypeJson[connectionKey],
              connectionKey,
              parametersJson,
              localSettingsJson.Values
            );
          });
        }
      });
      await saveWorkflowParameter(context, projectPath, parametersJson);
      await saveConnectionReferences(context, projectPath, { connections: connectionsData, settings: localSettingsJson.Values });
    } catch (error) {
      const errorMessage = localize(
        'errorParameterizeConnections',
        'Error while parameterizing existing connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

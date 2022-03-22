import type { Connection, FunctionsConnectionModel, ServiceProviderConnectionModel } from './connection';

const azureFunctionConnectorId = '123';

function convertServiceProviderConnectionDataToConnection(
  connectionKey: string,
  connectionData: ServiceProviderConnectionModel
): Connection {
  const {
    displayName,
    serviceProvider: { id: apiId },
  } = connectionData;

  return {
    name: connectionKey,
    id: `/${connectionKey}`,
    type: 'connections',
    properties: {
      apiId,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName ? displayName : '', // Danielle added, need to verify
      iconUri: '',
      statuses: [{ status: 'Connected' }],
      testLinks: [],
    },
  };
}

// function convertToServiceProviderConnectionsData(
//     connectionKey: string,
//     connectorId: string,
//     connectionInfo: ConnectionInfo,
//     connectionParameterMetadata: ConnectionParametersMetadata
// ): ConnectionAndAppSetting<ServiceProviderConnectionModel> {
//     const { displayName, connectionParameters } = connectionInfo;

//     const connectionsData: ConnectionAndAppSetting<ServiceProviderConnectionModel> = {
//         connectionKey,
//         connectionData: {
//             parameterValues: connectionParameters,
//             serviceProvider: { id: connectorId },
//             displayName,
//         },
//         settings: {},
//         pathLocation: [serviceProviderLocation],
//     };

//     for (const parameterKey of Object.keys(connectionParameterMetadata.connectionParameters)) {
//         const connectionParameter = connectionParameterMetadata.connectionParameters[parameterKey];
//         if (connectionParameter.parameterSource === ConnectionParameterSource.AppConfiguration) {
//             const appSettingName = `${escapeSpecialChars(connectionKey)}_${escapeSpecialChars(parameterKey)}`;
//             connectionsData.settings[appSettingName] = connectionInfo.connectionParameters[parameterKey];

//             connectionsData.connectionData.parameterValues[parameterKey] = `@appsetting('${appSettingName}')`;
//         }
//     }

//     return connectionsData;
// }

function convertFunctionsConnectionDataToConnection(connectionKey: string, connectionData: FunctionsConnectionModel): Connection {
  const { displayName } = connectionData;

  return {
    name: connectionKey,
    id: `/${connectionKey}`,
    type: 'connections',
    properties: {
      apiId: azureFunctionConnectorId,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName ? displayName : '', // Danielle added, need to verify
      iconUri: '',
      statuses: [{ status: 'Connected' }],
      testLinks: [],
    },
  };
}

// function convertToFunctionsConnectionsData(connectionKey: string, connectionInfo: ConnectionInfo): ConnectionAndAppSetting<FunctionsConnectionModel> {
//     const { displayName, connectionParameters } = connectionInfo;
//     const authentication = connectionParameters['authentication'];
//     const functionAppKey = authentication.value;
//     const appSettingName = `${escapeSpecialChars(connectionKey)}_functionAppKey`;

//     authentication.value = `@appsetting('${appSettingName}')`;

//     return {
//         connectionKey,
//         connectionData: {
//             function: connectionParameters['function'],
//             triggerUrl: connectionParameters['triggerUrl'],
//             authentication,
//             displayName,
//         },
//         settings: { [appSettingName]: functionAppKey },
//         pathLocation: [functionsLocation],
//     };
// }

function escapeSpecialChars(value: string): string {
  const escapedUnderscore = value.replace(/_/g, '__');
  return escapedUnderscore.replace(/-/g, '_1');
}
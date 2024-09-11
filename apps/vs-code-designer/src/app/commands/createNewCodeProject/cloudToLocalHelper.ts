import type { ParametersData, ConnectionsData } from '@microsoft/vscode-extension-logic-apps';

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

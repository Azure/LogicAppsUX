import type { ConnectionReferenceModel } from '@microsoft/vscode-extension-logic-apps';

export function extractConnectionDetails(connections: ConnectionReferenceModel): any {
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
              WORKFLOWS_TENANT_ID: '72f988bf-86f1-41af-91ab-2d7cd011db47',
            };
            details.push(detail);
          }
        }
      }
    }
    return details;
  }
}

export function changeAuthTypeToRaw(connections: ConnectionReferenceModel) {
  let data: string | undefined;
  if (connections) {
    const managedApiConnections = connections['managedApiConnections'];
    for (const connKey in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connKey)) {
        const authType = managedApiConnections[connKey]['authentication']['type'];
        if (authType === 'ManagedServiceIdentity') {
          console.log(`Changing type for ${connKey} from ${authType} to Raw`);
          managedApiConnections[connKey]['authentication']['type'] = 'Raw';
          managedApiConnections[connKey]['authentication']['scheme'] = 'Key';
          managedApiConnections[connKey]['authentication']['parameter'] = `@appsetting('${connKey}-connectionKey')`;
        }
      }
    }
    data = JSON.stringify(connections, null, 2);
  }
  return data;
}

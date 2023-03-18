import type { ConnectionCreationInfo, IHttpClient } from '@microsoft/designer-client-services-logic-apps';

type CreateConnectionFunc = (connectionInfo: ConnectionCreationInfo, connectionName: string) => Promise<ConnectionCreationInfo>;

interface ConnectionCreationClient {
  connectionCreationFunc: CreateConnectionFunc;
}

export interface ArmCallOptions {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  resourceGroup: string;
  appName: string;
  httpClient: IHttpClient;
}

interface FileShareConfig {
  type: string;
  endpoint: string;
  shareName: string;
  accountName: string;
  accessKey: string;
  mountPath: string;
}

interface ConfigMap {
  properties: Record<string, FileShareConfig>;
}

export class FileSystemConnectionCreationClient implements ConnectionCreationClient {
  constructor(private readonly options: ArmCallOptions) {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, httpClient } = this.options;

    if (!apiVersion) {
      throw new Error('apiVersion required');
    } else if (!baseUrl) {
      throw new Error('baseUrl required');
    } else if (!subscriptionId) {
      throw new Error('subscriptionId required');
    } else if (!resourceGroup) {
      throw new Error('resourceGroup required');
    } else if (!appName) {
      throw new Error('appName required');
    } else if (!httpClient) {
      throw new Error('httpClient required');
    }
  }

  private static createConfigFromConnectionParameters = (
    connectionInfo: ConnectionCreationInfo,
    connectionName: string
  ): FileShareConfig => {
    const rootFolder = connectionInfo.connectionParameters?.['rootFolder'];
    const username = connectionInfo.connectionParameters?.['username'];
    const password = connectionInfo.connectionParameters?.['password'];

    if (!rootFolder) {
      throw new Error('rootFolder required');
    }
    if (!username) {
      throw new Error('username required');
    }
    if (!password) {
      throw new Error('password required');
    }

    // (NOTE:anandgmenon): Verifying if rootFolder is in UNC Path format i.e \\<Machine-name>\<Share-name>.
    // eslint-disable-next-line no-useless-escape
    if (!rootFolder.match(/\\\\[^\\:\|\[\]\/";<>+=,?* _]+\\[^\\:\/*?"<>\|]+/g)) {
      throw new Error('rootFolder is not in valid format');
    }

    //NOTE(anandgmenon): splitting the endpoint and share name from the UNC path in the format \\<endpoint>\<shareName>.
    const endpointWithShareName = rootFolder.substring(2);
    const endpoint = endpointWithShareName.split('\\')[0];
    const shareName = endpointWithShareName.substring(endpoint.length + 1);

    return {
      type: 'FileShare',
      endpoint,
      shareName,
      accountName: username,
      accessKey: password,
      mountPath: `\\mounts\\${connectionName}`,
    };
  };

  connectionCreationFunc = async (connectionInfo: ConnectionCreationInfo, connectionName: string): Promise<ConnectionCreationInfo> => {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, httpClient } = this.options;
    const newFileShareConfig = FileSystemConnectionCreationClient.createConfigFromConnectionParameters(connectionInfo, connectionName);
    const configBaseUrl = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/config/azurestorageaccounts`;
    const configFetchUrl = `${configBaseUrl}/list`;

    //NOTE(anandgmenon): Fetching current file shares from the config
    const response = await httpClient.post<any, ConfigMap>({
      uri: configFetchUrl,
      queryParameters: { 'api-version': apiVersion },
    });

    //NOTE(anandgmenon): Updating config with new file share config
    response.properties[connectionName] = newFileShareConfig;
    await httpClient.put<ConfigMap, any>({
      uri: configBaseUrl,
      content: response,
      headers: { 'Content-Type': 'application/json' },
      queryParameters: { 'api-version': apiVersion },
    });

    // TODO(anandgmenon): We need to check if there's a better way to get the mountPath.
    // Right now this is only injected to site environment and portal cannot read that.
    const mountPath = `C:${newFileShareConfig.mountPath}`;

    return {
      ...connectionInfo,
      connectionParameters: { mountPath: mountPath },
    };
  };
}

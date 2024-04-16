import type { ConnectionCreationInfo, IHttpClient } from '@microsoft/logic-apps-shared';

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
    // eslint-disable-next-line no-useless-escape
    if (!rootFolder.match(/\\\\[^\\:\|\[\]\/";<>+=,?* _]+\\[^\\:\/*?"<>\|]+/g)) {
      throw new Error('rootFolder is not in valid format');
    }

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

  escapeSpecialChars = (value: string): string => {
    const escapedUnderscore = value.replace(/_/g, '__');
    return escapedUnderscore.replace(/-/g, '_1');
  };

  connectionCreationFunc = async (connectionInfo: ConnectionCreationInfo, connectionName: string): Promise<ConnectionCreationInfo> => {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, httpClient } = this.options;
    const newFileShareConfig = FileSystemConnectionCreationClient.createConfigFromConnectionParameters(connectionInfo, connectionName);
    const configBaseUrl = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/config/azurestorageaccounts`;
    const configFetchUrl = `${configBaseUrl}/list`;

    const password = newFileShareConfig.accessKey;
    const appSettingNameForPassword = `${this.escapeSpecialChars(connectionName)}_password`;
    newFileShareConfig.accessKey = `@AppSettingRef(${appSettingNameForPassword})`;

    const response = await httpClient.post<any, ConfigMap>({
      uri: configFetchUrl,
      queryParameters: { 'api-version': apiVersion },
    });
    response.properties[connectionName] = newFileShareConfig;
    await httpClient.put<ConfigMap, any>({
      uri: configBaseUrl,
      content: response,
      headers: { 'Content-Type': 'application/json' },
      queryParameters: { 'api-version': apiVersion },
    });

    const mountPath = `C:${newFileShareConfig.mountPath}`;
    return {
      ...connectionInfo,
      connectionParameters: { mountPath: mountPath },
      appSettings: { [appSettingNameForPassword]: password },
    };
  };
}

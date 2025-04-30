import type { Connector, OperationInfo, OperationManifest } from '../../../utils/src';
import { ConnectionType, equals } from '../../../utils/src';
import { BaseOperationManifestService } from '../base';
import type { BaseOperationManifestServiceOptions } from '../base/operationmanifest';
import { getBuiltInOperationInfo, isBuiltInOperation, supportedBaseManifestObjects } from '../base/operationmanifest';
import { getHybridAppBaseRelativeUrl, hybridApiVersion, isHybridLogicApp } from './hybrid';
import { getClientBuiltInConnectors } from '../base/search';

export interface StandardOperationManifestServiceOptions extends BaseOperationManifestServiceOptions {
  getCachedOperation?: (connectorName: string, operationName: string) => Promise<any>;
}

export class StandardOperationManifestService extends BaseOperationManifestService {
  private allBuiltInConnectors: Record<string, Connector> = {};

  constructor(private readonly _options: StandardOperationManifestServiceOptions) {
    super(_options);
    this.allBuiltInConnectors = getClientBuiltInConnectors().reduce((result: Record<string, Connector>, connector: Connector) => {
      result[connector.id.toLowerCase()] = connector;
      return result;
    }, {});
  }

  override async getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo> {
    if (isBuiltInOperation(definition)) {
      return getBuiltInOperationInfo(definition, isTrigger);
    }
    if (isServiceProviderOperation(definition.type)) {
      return {
        connectorId: definition.inputs.serviceProviderConfiguration.serviceProviderId,
        operationId: definition.inputs.serviceProviderConfiguration.operationId,
      };
    }

    return {
      connectorId: 'Unknown',
      operationId: 'Unknown',
    };

    //throw new UnsupportedException(`Operation type: ${definition.type} does not support manifest.`);
  }

  override async getOperation(connectorId: string, operationId: string, useCachedData = false): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const connectorName = connectorId.split('/').slice(-1)[0];
    const operationName = operationId.split('/').slice(-1)[0];

    const supportedManifest = supportedBaseManifestObjects.get(operationId);
    if (supportedManifest) {
      return {
        properties: {
          connector: { properties: { displayName: supportedManifest.properties.connector?.properties.displayName } },
          brandColor: supportedManifest.properties.brandColor,
          description: supportedManifest.properties.description,
          iconUri: supportedManifest.properties.iconUri,
        },
      };
    }

    if (useCachedData && this._options.getCachedOperation) {
      const data = await this._options.getCachedOperation(connectorName, operationName);
      if (data) {
        return data;
      }
    }

    const queryParameters = {
      'api-version': apiVersion,
    };

    let response = null;
    if (isHybridLogicApp(baseUrl)) {
      response = await httpClient.post<any, null>({
        uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=${hybridApiVersion}`,
        headers: {
          'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operationGroups/${connectorName}/operations/${operationName}?$expand=properties/manifest`,
          'x-ms-logicapps-proxy-method': 'GET',
        },
      });
    } else {
      response = await httpClient.get<any>({
        uri: `${baseUrl}/operationGroups/${connectorName}/operations/${operationName}`,
        queryParameters,
      });
    }

    const {
      properties: { brandColor, description, iconUri, api },
    } = response;

    return {
      properties: {
        connector: { properties: { displayName: api.properties.displayName } },
        brandColor: brandColor ?? api?.brandColor,
        description,
        iconUri: iconUri ?? api?.iconUri,
      },
    };
  }

  override async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    const supportedManifest = supportedBaseManifestObjects.get(operationId);
    if (supportedManifest) {
      return supportedManifest;
    }

    const { apiVersion, baseUrl, httpClient } = this.options;
    const connectorName = connectorId.split('/').slice(-1)[0];
    const operationName = operationId.split('/').slice(-1)[0];
    const queryParameters = {
      'api-version': apiVersion,
      $expand: 'properties/manifest',
    };

    try {
      let response = null;
      if (isHybridLogicApp(baseUrl)) {
        response = await httpClient.post<any, null>({
          uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=${hybridApiVersion}`,
          headers: {
            'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operationGroups/${connectorName}/operations/${operationName}?$expand=properties/manifest`,
            'x-ms-logicapps-proxy-method': 'GET',
          },
        });
      } else {
        response = await httpClient.get<any>({
          uri: `${baseUrl}/operationGroups/${connectorName}/operations/${operationName}`,
          queryParameters,
        });
      }

      const {
        properties: { brandColor, description, iconUri, manifest, operationType, api },
      } = response;

      // TODO: Remove below patching of connection when backend api sends correct information for service providers
      const operationManifest = {
        properties: {
          brandColor: brandColor ?? api?.brandColor,
          description,
          iconUri: iconUri ?? api?.iconUri,
          connection: isServiceProviderOperation(operationType) ? { required: true, type: ConnectionType.ServiceProvider } : undefined,
          ...manifest,
        },
      };

      return operationManifest;
    } catch (_error) {
      return { properties: {} } as any;
    }
  }

  override isBuiltInConnector(connectorId: string): boolean {
    return this.allBuiltInConnectors[connectorId.toLowerCase()] !== undefined;
  }

  override getBuiltInConnector(connectorId: string): Connector {
    return this.allBuiltInConnectors[connectorId.toLowerCase()];
  }
}

export function isServiceProviderOperation(operationType?: string): boolean {
  return equals(operationType, 'ServiceProvider');
}

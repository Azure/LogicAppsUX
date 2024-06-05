import type { OperationInfo, OperationManifest } from '../../../utils/src';
import { ConnectionType, equals } from '../../../utils/src';
import { BaseOperationManifestService } from '../base';
import { getBuiltInOperationInfo, isBuiltInOperation, supportedBaseManifestObjects } from '../base/operationmanifest';

export class StandardOperationManifestService extends BaseOperationManifestService {
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

  public isHybridLogicApp(uri: string): boolean {
    return uri.toLowerCase().includes('microsoft.app');
  }

  public getHybridAppBaseRelativeUrl(appId: string | undefined): string {
    if (!appId) {
      throw new Error(`Invalid value for appId: '${appId}'`);
    }

    if (appId.endsWith('/')) {
      appId = appId.substring(0, appId.length - 1);
    }

    return `${appId}/providers/Microsoft.App/logicApps/${appId.split('/').pop()}`;
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
      if (this.isHybridLogicApp(baseUrl)) {
        response = await httpClient.post<any, null>({
          uri: `${this.getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=2024-02-02-preview`.replace(
            'management.azure.com',
            'brazilus.management.azure.com'
          ),
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
    } catch (error) {
      return { properties: {} } as any;
    }
  }
}

export function isServiceProviderOperation(operationType?: string): boolean {
  return equals(operationType, 'ServiceProvider');
}

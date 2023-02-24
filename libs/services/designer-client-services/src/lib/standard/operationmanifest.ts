import { BaseOperationManifestService } from '../base';
import { getBuiltInOperationInfo, isBuiltInOperation, supportedBaseManifestObjects } from '../base/operationmanifest';
import type { OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';
import { isCustomConnector, equals, ConnectionType } from '@microsoft/utils-logic-apps';

export class StandardOperationManifestService extends BaseOperationManifestService {
  override async getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo> {
    if (isBuiltInOperation(definition)) {
      return getBuiltInOperationInfo(definition, isTrigger);
    } else if (isServiceProviderOperation(definition)) {
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

  override async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    const supportedManifest = supportedBaseManifestObjects.get(operationId);
    if (supportedManifest) return supportedManifest;

    if (isCustomConnector(connectorId)) return await this.getCustomOperationManifest(connectorId, operationId);

    const { apiVersion, baseUrl, httpClient } = this.options;
    const connectorName = connectorId.split('/').slice(-1)[0];
    const operationName = operationId.split('/').slice(-1)[0];
    const queryParameters = {
      'api-version': apiVersion,
      $expand: 'properties/manifest',
    };

    try {
      const response = await httpClient.get<any>({
        uri: `${baseUrl}/operationGroups/${connectorName}/operations/${operationName}`,
        queryParameters,
      });

      const {
        properties: { brandColor, description, iconUri, manifest, operationType },
      } = response;

      // TODO: Remove below patching of connection when backend api sends correct information for service providers
      const operationManifest = {
        properties: {
          brandColor,
          description,
          iconUri,
          connection: equals(operationType, 'serviceprovider') ? { required: true, type: ConnectionType.ServiceProvider } : undefined,
          ...manifest,
        },
      };

      return operationManifest;
    } catch (error) {
      return { properties: {} } as any;
    }
  }

  private async getCustomOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const operationName = operationId.split('/').pop();
    const queryParameters = {
      'api-version': apiVersion,
      $expand: 'properties/manifest',
    };

    try {
      const response = await httpClient.get<any>({
        uri: `${baseUrl}/${connectorId}/operations/${operationName}`,
        queryParameters,
      });

      // find matching operation by id
      const operationResponse = response.value.find((operation: any) => equals(operation.id.split('/').pop(), operationId));

      const {
        properties: { brandColor, description, iconUri, manifest, operationType },
      } = operationResponse;

      const operationManifest = {
        properties: {
          brandColor,
          description,
          iconUri,
          connection: equals(operationType, 'serviceprovider') ? { required: true, type: ConnectionType.ServiceProvider } : undefined,
          ...manifest,
        },
      };

      return operationManifest;
    } catch (error) {
      console.error('Error getting custom operation manifest', error);
      return { properties: {} } as any;
    }
  }
}

function isServiceProviderOperation(definition: any): boolean {
  return equals(definition.type, 'ServiceProvider');
}

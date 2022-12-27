import { StandardOperationManifestService } from '../standard';
import { supportedConsumptionManifestObjects } from '../standard/operationmanifest';
import type { OperationManifest } from '@microsoft/utils-logic-apps';
import { equals, ConnectionType } from '@microsoft/utils-logic-apps';

export class ConsumptionOperationManifestService extends StandardOperationManifestService {
  override async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    const supportedManifest = supportedConsumptionManifestObjects.get(operationId);

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
}

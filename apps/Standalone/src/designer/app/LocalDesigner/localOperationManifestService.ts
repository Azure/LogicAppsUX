import { ConsumptionOperationManifestService, StandardOperationManifestService } from '@microsoft/logic-apps-shared';

const isCompose = (connectorId: string, operationId: string) =>
  connectorId.toLowerCase() === 'connectionproviders/dataoperationnew' && operationId.toLowerCase() === 'composenew';

/** Local Standard has no runtime endpoint for Compose; reuse the complete repository-owned offline manifest. */
export class LocalOperationManifestService extends StandardOperationManifestService {
  private readonly offline: ConsumptionOperationManifestService;

  constructor(options: ConstructorParameters<typeof StandardOperationManifestService>[0]) {
    super(options);
    this.offline = new ConsumptionOperationManifestService({ ...options, subscriptionId: 'subid', location: 'location' });
  }

  override async getOperationManifest(connectorId: string, operationId: string) {
    return isCompose(connectorId, operationId)
      ? this.offline.getOperationManifest(connectorId.toLowerCase(), operationId.toLowerCase())
      : super.getOperationManifest(connectorId, operationId);
  }

  override async getOperation(connectorId: string, operationId: string, useCachedData = false) {
    return isCompose(connectorId, operationId)
      ? this.offline.getOperation(connectorId.toLowerCase(), operationId.toLowerCase())
      : super.getOperation(connectorId, operationId, useCachedData);
  }
}

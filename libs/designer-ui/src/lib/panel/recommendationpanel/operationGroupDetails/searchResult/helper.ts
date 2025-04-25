import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import type { OperationActionData } from '../../interfaces';
import { isBuiltInConnector } from '../../../../connectors';
import { getConnectorCategoryString } from '../../../../utils';

export const OperationActionDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => ({
  id: operation.id,
  title: operation.properties.summary,
  description: operation.properties.description,
  brandColor: operation.properties.api.brandColor,
  iconUri: operation.properties.api.iconUri,
  connectorName: operation.properties.api.displayName,
  category: getConnectorCategoryString(operation.properties.api),
  isTrigger: !!operation.properties?.trigger,
  isBuiltIn: isBuiltInConnector(operation.properties.api),
  apiId: operation.properties.api.id,
  releaseStatus: operation.properties.annotation?.status,
});

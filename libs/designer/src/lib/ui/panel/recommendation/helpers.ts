import type { OperationActionData, OperationGroupCardData } from '@microsoft/designer-ui';
import { getConnectorCategoryString, isBuiltInConnector, isCustomConnector } from '@microsoft/designer-ui';
import type { Connector, DiscoveryOperation, DiscoveryResultTypes, OperationApi } from '@microsoft/logic-apps-shared';
import {
  getBrandColorFromConnector,
  getDescriptionFromConnector,
  getDisplayNameFromConnector,
  getIconUriFromConnector,
} from '@microsoft/logic-apps-shared';

export const getOperationGroupCardDataFromConnector = (connector: Connector | OperationApi): OperationGroupCardData => ({
  description: getDescriptionFromConnector(connector),
  iconUri: getIconUriFromConnector(connector),
  connectorName: getDisplayNameFromConnector(connector),
  apiId: connector.id,
  brandColor: getBrandColorFromConnector(connector),
  isCustom: isCustomConnector(connector),
});

export const getOperationCardDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => ({
  id: operation.id,
  title: operation.properties.summary,
  description: operation.properties.description,
  brandColor: operation.properties.api.brandColor,
  iconUri: operation.properties.api.iconUri,
  connectorName: operation.properties.api.displayName,
  category: getConnectorCategoryString(operation.properties.api),
  isTrigger: !!operation.properties?.trigger,
  isBuiltIn: isBuiltInConnector(operation.properties.api),
  isCustom: isCustomConnector(operation.properties.api),
  apiId: operation.properties.api.id,
  releaseStatus: operation.properties.annotation?.status,
});

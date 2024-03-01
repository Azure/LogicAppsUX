import type { Connector, ConnectorProperty, OperationApi } from '@microsoft/logic-apps-shared';
import { fallbackConnectorIconUrl } from '@microsoft/logic-apps-shared';

export const getBrandColorFromConnector = (connector: Connector | OperationApi | undefined): string => {
  return getFlatConnectorData(connector)?.brandColor ?? '#000000';
};

export const getDisplayNameFromConnector = (connector: Connector | OperationApi | undefined): string => {
  return getFlatConnectorData(connector)?.displayName ?? '';
};

export const getDescriptionFromConnector = (connector: Connector | OperationApi | undefined): string => {
  const connectorData = getFlatConnectorData(connector);
  return connectorData.description ?? connectorData.generalInformation?.description ?? '';
};

export const getIconUriFromConnector = (connector: Connector | OperationApi | undefined): string => {
  const connectorData = getFlatConnectorData(connector);
  const iconUrl = connectorData.iconUrl ?? connectorData.iconUri ?? connectorData.generalInformation?.iconUrl;
  return fallbackConnectorIconUrl(iconUrl);
};

const getFlatConnectorData = (connector: Connector | OperationApi | undefined): Partial<ConnectorProperty & OperationApi> => {
  if (!connector) {
    return {};
  }

  if ('properties' in connector) {
    return { id: connector.id, ...connector.properties };
  }

  return connector;
};

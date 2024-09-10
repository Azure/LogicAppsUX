import type { Connector, ConnectorProperty, OperationApi } from '../models';
import { fallbackConnectorIconUrl, isArmResourceId } from './connections';

export const getAllConnectorProperties = (connector: Connector | OperationApi | undefined): Partial<ConnectorProperty & OperationApi> => {
  if (!connector) {
    return {};
  }

  if ('properties' in connector) {
    return { id: connector.id, ...connector.properties };
  }

  return connector;
};

export const getBrandColorFromConnector = (connector: Connector | OperationApi | undefined): string => {
  const connectorData = getAllConnectorProperties(connector);
  return connectorData?.brandColor ?? connectorData.metadata?.brandColor ?? '#000000';
};

export const getDescriptionFromConnector = (connector: Connector | OperationApi | undefined): string => {
  const connectorData = getAllConnectorProperties(connector);
  return connectorData.description ?? connectorData.generalInformation?.description ?? '';
};

export const getDisplayNameFromConnector = (connector: Connector | OperationApi | undefined): string => {
  return getAllConnectorProperties(connector)?.displayName ?? '';
};

export const getIconUriFromConnector = (connector: Connector | OperationApi | undefined): string => {
  const connectorData = getAllConnectorProperties(connector);
  const iconUrl = connectorData.iconUrl ?? connectorData.iconUri ?? connectorData.generalInformation?.iconUrl;
  return fallbackConnectorIconUrl(iconUrl);
};

export function normalizeConnectorId(connectorId: string, subscriptionId: string, location: string) {
  if (!isArmResourceId(connectorId)) {
    return connectorId;
  }

  const result = connectorId.replaceAll('#subscription#', subscriptionId);
  return result.replaceAll('#location#', location);
}

export function normalizeConnectorIds(connectorIds: string[], subscriptionId: string, location: string) {
  return connectorIds.map((connectorId) => normalizeConnectorId(connectorId, subscriptionId, location));
}

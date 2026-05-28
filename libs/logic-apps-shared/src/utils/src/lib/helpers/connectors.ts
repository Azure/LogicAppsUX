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

export const subscriptionPlaceholder = '#subscription#';
export const locationPlaceholder = '#location#';
export function normalizeConnectorId(connectorId: string, subscriptionId: string, location: string, lowercase = false) {
  const result = isArmResourceId(connectorId)
    ? connectorId.replaceAll(subscriptionPlaceholder, subscriptionId).replaceAll(locationPlaceholder, location)
    : connectorId;

  return lowercase ? result.toLowerCase() : result;
}

export function normalizeConnectorIds(connectorIds: string[], subscriptionId: string, location: string, lowercase = false) {
  return connectorIds.map((connectorId) => normalizeConnectorId(connectorId, subscriptionId, location, lowercase));
}

/**
 * Checks if a connector is an Independent Publisher connector.
 * Independent Publisher connectors are identified by having "(Independent Publisher)" in their display name
 * or by having a connector name/id ending with "ip" suffix.
 * @param connector - The connector to check
 * @returns true if the connector is an Independent Publisher connector
 */
export const isIndependentPublisherConnector = (connector: Connector | OperationApi | undefined): boolean => {
  if (!connector) {
    return false;
  }

  const displayName = getDisplayNameFromConnector(connector);
  if (displayName.includes('(Independent Publisher)')) {
    return true;
  }

  // Check if connector name ends with 'ip' suffix (common pattern for independent publisher connectors)
  const connectorId = 'id' in connector ? connector.id : '';
  const connectorName = connectorId.split('/').pop()?.toLowerCase() ?? '';
  // Only consider it an IP connector if the name ends with 'ip' and is at least 3 chars (to avoid false positives)
  if (connectorName.length >= 3 && connectorName.endsWith('ip')) {
    return true;
  }

  return false;
};

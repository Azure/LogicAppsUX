import { useCallback, useMemo } from 'react';
import type { Connector } from '@microsoft/logic-apps-shared';
import { BrowseGrid } from '@microsoft/designer-ui';

const sortConnectors = (connectors: Connector[]): Connector[] => {
  return connectors.sort((a, b) => {
    return (a.properties?.displayName ?? '').localeCompare(b.properties?.displayName ?? '');
  });
};

const supportsActions = (connector: Connector): boolean => {
  const capabilities = connector.properties?.capabilities ?? [];

  // If no capabilities are defined, assume it doesn't support actions
  if (capabilities.length === 0) {
    return false;
  }

  // Check if it explicitly supports actions
  return capabilities.includes('actions');
};

const matchesSearch = (connector: Connector, searchTerm: string): boolean => {
  if (!searchTerm) {
    return true;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  const displayName = connector.properties?.displayName?.toLowerCase() ?? '';
  const description = connector.properties?.description?.toLowerCase() ?? '';

  return displayName.includes(lowerSearchTerm) || description.includes(lowerSearchTerm);
};

interface ConnectorBrowseViewProps {
  connectors: Connector[];
  isLoading: boolean;
  onConnectorSelect: (connectorId: string) => void;
  searchTerm: string;
}

export const ConnectorBrowseView = ({ connectors, isLoading, onConnectorSelect, searchTerm }: ConnectorBrowseViewProps) => {
  const filteredConnectors = useMemo(() => {
    const filtered = connectors.filter((connector) => supportsActions(connector) && matchesSearch(connector, searchTerm));

    return sortConnectors(filtered);
  }, [connectors, searchTerm]);

  const handleConnectorClick = useCallback(
    (connectorId: string) => {
      onConnectorSelect(connectorId);
    },
    [onConnectorSelect]
  );

  return (
    <BrowseGrid
      onConnectorSelected={handleConnectorClick}
      operationsData={filteredConnectors}
      isLoading={isLoading}
      displayRuntimeInfo={false}
      isConnector={true}
      hideFavorites={true}
    />
  );
};

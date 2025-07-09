import { useCallback, useMemo } from 'react';
import { cleanConnectorId, type Connector } from '@microsoft/logic-apps-shared';
import { BrowseGrid } from '@microsoft/designer-ui';
import { useAllManagedApiIdsWithActions } from '../../../core/queries/browse';

const sortConnectors = (connectors: Connector[]): Connector[] => {
  return connectors.sort((a, b) => {
    return (a.properties?.displayName ?? '').localeCompare(b.properties?.displayName ?? '');
  });
};

interface ConnectorBrowseViewProps {
  connectors: Connector[];
  isLoading: boolean;
  onConnectorSelect: (connectorId: string) => void;
  searchTerm: string;
}

export const ConnectorBrowseView = ({ connectors, isLoading, onConnectorSelect, searchTerm }: ConnectorBrowseViewProps) => {
  const allApiIdsWithActions = useAllManagedApiIdsWithActions();

  const filteredConnectors = useMemo(() => {
    let filtered = connectors;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (connector) =>
          connector.properties?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          connector.properties?.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter to only connectors that support actions
    if (allApiIdsWithActions.data.length > 0) {
      filtered = filtered.filter((connector) => {
        const capabilities = connector.properties?.capabilities ?? [];
        const ignoreCapabilities = !capabilities.includes('triggers') && !capabilities.includes('actions');
        const connectorId = cleanConnectorId(connector.id);

        const supportsActions = (ignoreCapabilities || capabilities.includes('actions')) && allApiIdsWithActions.data.includes(connectorId);
        return supportsActions;
      });
    }

    return sortConnectors(filtered);
  }, [connectors, searchTerm, allApiIdsWithActions.data]);

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

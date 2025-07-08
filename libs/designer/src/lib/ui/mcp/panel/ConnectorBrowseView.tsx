import { useCallback, useMemo } from 'react';
import { cleanConnectorId, getRecordEntry, type Connector } from '@microsoft/logic-apps-shared';
import { BrowseGrid, isBuiltInConnector, isCustomConnector, RuntimeFilterTagList } from '@microsoft/designer-ui';
import { useAllApiIdsWithActions, useAllApiIdsWithTriggers } from '../../../core/queries/browse';

// Simplified version of the filtering logic from original BrowseView
const defaultFilterConnector = (connector: Connector, runtimeFilter: string): boolean => {
  if (runtimeFilter === 'inapp' && !isBuiltInConnector(connector)) {
    return false;
  }
  if (runtimeFilter === 'custom' && !isCustomConnector(connector)) {
    return false;
  }
  if (runtimeFilter === 'shared') {
    if (isBuiltInConnector(connector) || isCustomConnector(connector)) {
      return false;
    }
  }
  return true;
};

const priorityConnectors = [
  'connectionproviders/request',
  'connectionProviders/http',
  'serviceProviders/serviceBus',
  '/managedApis/sql',
  'managedApis/office365',
];

const sortConnectors = (connectors: Connector[]): Connector[] => {
  return connectors.sort((a, b) => {
    const aIndex = priorityConnectors.findIndex((p) => a.id.toLowerCase().includes(p.toLowerCase()));
    const bIndex = priorityConnectors.findIndex((p) => b.id.toLowerCase().includes(p.toLowerCase()));

    // Priority connectors first
    if (aIndex !== -1 && bIndex === -1) {
      return -1;
    }
    if (bIndex !== -1 && aIndex === -1) {
      return 1;
    }
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Then alphabetical
    return (a.properties?.displayName ?? '').localeCompare(b.properties?.displayName ?? '');
  });
};

interface ConnectorBrowseViewProps {
  connectors: Connector[];
  isLoading: boolean;
  onConnectorSelect: (connectorId: string) => void;
  searchTerm: string;
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
}

export const ConnectorBrowseView = ({
  connectors,
  isLoading,
  onConnectorSelect,
  searchTerm,
  filters = {},
  setFilters,
}: ConnectorBrowseViewProps) => {
  const allApiIdsWithActions = useAllApiIdsWithActions();
  const allApiIdsWithTriggers = useAllApiIdsWithTriggers();

  const filteredConnectors = useMemo(() => {
    let filtered = connectors;

    if (searchTerm) {
      filtered = filtered.filter(
        (connector) =>
          connector.properties?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          connector.properties?.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (getRecordEntry(filters, 'runtime')) {
      filtered = filtered.filter((connector) => defaultFilterConnector(connector, filters.runtime));
    }

    if (getRecordEntry(filters, 'actionType') && (allApiIdsWithActions.data.length > 0 || allApiIdsWithTriggers.data.length > 0)) {
      filtered = filtered.filter((connector) => {
        const capabilities = connector.properties?.capabilities ?? [];
        const ignoreCapabilities = !capabilities.includes('triggers') && !capabilities.includes('actions');
        const connectorId = cleanConnectorId(connector.id);

        const supportsActions = (ignoreCapabilities || capabilities.includes('actions')) && allApiIdsWithActions.data.includes(connectorId);
        const supportsTriggers =
          (ignoreCapabilities || capabilities.includes('triggers')) && allApiIdsWithTriggers.data.includes(connectorId);

        if (filters.actionType?.toLowerCase() === 'triggers') {
          return supportsTriggers;
        }
        if (filters.actionType?.toLowerCase() === 'actions') {
          return supportsActions;
        }
        return true;
      });
    }

    return sortConnectors(filtered);
  }, [connectors, searchTerm, filters, allApiIdsWithActions.data, allApiIdsWithTriggers.data]);

  const handleConnectorClick = useCallback(
    (connectorId: string) => {
      onConnectorSelect(connectorId);
    },
    [onConnectorSelect]
  );

  return (
    <>
      {setFilters && <RuntimeFilterTagList filters={filters} setFilters={setFilters} />}

      <BrowseGrid
        onConnectorSelected={handleConnectorClick}
        operationsData={filteredConnectors}
        isLoading={isLoading}
        displayRuntimeInfo={false}
        isConnector={true}
        hideFavorites={true}
      />
    </>
  );
};

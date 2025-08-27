import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { equals, getRecordEntry, type Connector } from '@microsoft/logic-apps-shared';
import { isBuiltInConnector, isCustomConnector, RuntimeFilterTagList } from '@microsoft/designer-ui';
import { Text, Spinner } from '@fluentui/react-components';
import { ALLOWED_A2A_CONNECTOR_NAMES } from './helpers';
import { useShouldEnableACASession } from './hooks';
import { ConnectorCard } from './connectorCard';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import type { AppDispatch } from '../../../core';
import { useConnectorBrowseStyles } from './styles/ConnectorBrowse.styles';

const priorityConnectors = [
  'managedApis/office365',
  'managedApis/sharepointonline',
  'managedApis/teams',
  'managedApis/onedriveforbusiness',
  'managedApis/outlook',
  'managedApis/dynamics365',
  'managedApis/salesforce',
  'managedApis/sql',
  'managedApis/azureblob',
  'managedApis/filesystem',
];

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

const getRunTimeValue = (connector: Connector): number => {
  if (isBuiltInConnector(connector)) {
    return 100;
  }
  if (isCustomConnector(connector)) {
    return 200;
  }
  return 300;
};

const getPriorityValue = (connector: Connector): number => {
  const t = priorityConnectors.findIndex((p) => connector.id.toLowerCase().endsWith(p.toLowerCase()));
  return t !== -1 ? 200 - t : 100;
};

const defaultSortConnectors = (connectors: Connector[]): Connector[] => {
  return connectors.sort((a, b) => {
    return (
      getPriorityValue(b) - getPriorityValue(a) ||
      getRunTimeValue(a) - getRunTimeValue(b) ||
      a.properties.displayName?.localeCompare(b.properties.displayName) ||
      0
    );
  });
};

export interface ConnectorBrowseV2Props {
  categoryKey: string;
  onConnectorSelected?: (connectorId: string, origin?: string) => void;
  connectorFilters?: string[];
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  displayRuntimeInfo?: boolean;
  hideFilters?: boolean;
}

export const ConnectorBrowse = ({
  categoryKey,
  onConnectorSelected,
  connectorFilters,
  filters = {},
  setFilters,
  displayRuntimeInfo = false,
  hideFilters = false,
}: ConnectorBrowseV2Props) => {
  const intl = useIntl();
  const classes = useConnectorBrowseStyles();
  const dispatch = useDispatch<AppDispatch>();
  const shouldEnableACASession = useShouldEnableACASession();
  const isA2AWorkflow = useIsA2AWorkflow();
  const isAddingToGraph = useDiscoveryPanelRelationshipIds().graphId === 'root';

  const { data: allConnectors, isLoading } = useAllConnectors();

  const isAgentConnectorAllowed = useCallback((connector: Connector): boolean => {
    return connector.id !== 'connectionProviders/agent';
  }, []);

  const isACASessionAllowed = useCallback(
    (connector: Connector): boolean => {
      return !(shouldEnableACASession === false && connector.id === '/serviceProviders/acasession');
    },
    [shouldEnableACASession]
  );

  const passesRuntimeFilter = useCallback(
    (connector: Connector): boolean => {
      const runtimeFilter = getRecordEntry(filters, 'runtime');
      if (!runtimeFilter) {
        return true;
      }
      return defaultFilterConnector(connector, runtimeFilter);
    },
    [filters]
  );

  const passesActionTypeFilter = useCallback(
    (connector: Connector): boolean => {
      const actionType = getRecordEntry(filters, 'actionType')?.toLowerCase();
      if (!actionType) {
        return true;
      }

      const capabilities = connector.properties?.capabilities ?? [];
      const hasCapabilities = capabilities.length > 0;

      // If no capabilities specified, assume connector supports both actions and triggers
      if (!hasCapabilities) {
        return true;
      }

      // If connector has neither actions nor triggers capabilities, show it (assume it supports both)
      const hasActionCapabilities = capabilities.includes('actions') || capabilities.includes('triggers');
      if (!hasActionCapabilities) {
        return true;
      }

      // Filter based on specific action type for connectors that do have explicit capabilities
      if (actionType === 'triggers') {
        return capabilities.includes('triggers');
      }
      if (actionType === 'actions') {
        return capabilities.includes('actions');
      }

      return true;
    },
    [filters]
  );

  const passesA2AWorkflowFilter = useCallback(
    (connector: Connector): boolean => {
      // Only apply this filter if it's A2A workflow and adding to root
      if (!isA2AWorkflow || !isAddingToGraph) {
        return true;
      }

      const connectorType = connector.type;
      const connectorName = connector.name;

      if (connectorName && ALLOWED_A2A_CONNECTOR_NAMES.has(connectorName)) {
        return true;
      }

      // Allow APIConnection or ServiceProvider types
      if (connectorType) {
        return equals(connectorType, 'Microsoft.Web/locations/managedApis') || equals(connectorType, 'ServiceProvider');
      }

      return false;
    },
    [isA2AWorkflow, isAddingToGraph]
  );

  const passesCategoryFilter = useCallback(
    (connector: Connector): boolean => {
      // For "otherWays" or when no filters, show all connectors
      if (categoryKey === 'otherWays' || !connectorFilters || connectorFilters.length === 0) {
        return true;
      }

      const name = connector.name?.toLowerCase() || '';
      const displayName = connector.properties?.displayName?.toLowerCase() || '';

      return connectorFilters.some((filter) => name.includes(filter.toLowerCase()) || displayName.includes(filter.toLowerCase()));
    },
    [categoryKey, connectorFilters]
  );

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      return (
        isAgentConnectorAllowed(connector) &&
        isACASessionAllowed(connector) &&
        passesRuntimeFilter(connector) &&
        passesActionTypeFilter(connector) &&
        passesA2AWorkflowFilter(connector) &&
        passesCategoryFilter(connector)
      );
    },
    [
      isAgentConnectorAllowed,
      isACASessionAllowed,
      passesRuntimeFilter,
      passesActionTypeFilter,
      passesA2AWorkflowFilter,
      passesCategoryFilter,
    ]
  );

  const sortedConnectors = useMemo(() => {
    const connectors = allConnectors?.filter(filterItems) ?? [];
    return defaultSortConnectors(connectors);
  }, [allConnectors, filterItems]);

  const handleConnectorSelected = useCallback(
    (connectorId: string) => {
      // Set the selected operation group to show connector operations
      dispatch(selectOperationGroupId(connectorId));
      // Also call the original handler if provided
      onConnectorSelected?.(connectorId, 'trigger-browse-v2');
    },
    [dispatch, onConnectorSelected]
  );

  const emptyStateText = intl.formatMessage({
    defaultMessage: 'No connectors found for this category',
    id: '2hl9xo',
    description: 'No connectors message',
  });

  // Show loading state
  if (isLoading && sortedConnectors.length === 0) {
    return (
      <div className={classes.loadingContainer}>
        <Spinner size="medium" label="Loading connectors..." />
      </div>
    );
  }

  // Show empty state
  if (!isLoading && sortedConnectors.length === 0) {
    return (
      <>
        {!hideFilters && setFilters && <RuntimeFilterTagList filters={filters} setFilters={setFilters} />}

        <div className={classes.emptyStateContainer}>
          <Text>{emptyStateText}</Text>
        </div>
      </>
    );
  }

  return (
    <>
      {!hideFilters && setFilters && <RuntimeFilterTagList filters={filters} setFilters={setFilters} />}

      <div className={classes.connectorGrid}>
        {sortedConnectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            onClick={handleConnectorSelected}
            displayRuntimeInfo={displayRuntimeInfo}
          />
        ))}
      </div>
    </>
  );
};

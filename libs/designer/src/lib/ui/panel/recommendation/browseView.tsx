import { useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { SearchService, equals, getRecordEntry, type Connector } from '@microsoft/logic-apps-shared';
import { BrowseGrid, isBuiltInConnector, isCustomConnector, RuntimeFilterTagList } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useShouldEnableACASession } from './hooks';
import { ALLOWED_A2A_CONNECTOR_NAMES } from './helpers';

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
  'connectionProviders/inlineCode',
  'serviceProviders/serviceBus',
  '/managedApis/sql',
  '/connectionProviders/azureFunctionOperation',
  'managedApis/office365',
  'managedApis/sharepointonline',
];
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
      a.properties.displayName?.localeCompare(b.properties.displayName)
    );
  });
};

export interface BrowseViewProps {
  filters: Record<string, string>;
  displayRuntimeInfo: boolean;
  setFilters: (filters: Record<string, string>) => void;
  onConnectorCardSelected: (connectorId: string) => void;
}

export const BrowseView = (props: BrowseViewProps) => {
  const { filters, displayRuntimeInfo, setFilters } = props;
  const shouldEnableACASession = useShouldEnableACASession();
  const isA2AWorkflow = useIsA2AWorkflow();
  const isAddingToGraph = useDiscoveryPanelRelationshipIds().graphId === 'root';

  const dispatch = useDispatch();

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

      const filterMethod = SearchService().filterConnector?.bind(SearchService()) || defaultFilterConnector;
      return filterMethod(connector, runtimeFilter);
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
        return equals(connectorType, 'Microsoft.Web/locations/managedApis') || equals(connectorType, 'serviceProvider');
      }

      return false;
    },
    [isA2AWorkflow, isAddingToGraph]
  );

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      console.log(connector);
      return (
        isAgentConnectorAllowed(connector) &&
        isACASessionAllowed(connector) &&
        passesRuntimeFilter(connector) &&
        passesActionTypeFilter(connector) &&
        passesA2AWorkflowFilter(connector)
      );
    },
    [isAgentConnectorAllowed, isACASessionAllowed, passesRuntimeFilter, passesActionTypeFilter, passesA2AWorkflowFilter]
  );

  const sortedConnectors = useMemo(() => {
    const connectors = allConnectors?.filter(filterItems) ?? [];
    const sortMethod = SearchService().sortConnectors?.bind(SearchService()) || defaultSortConnectors;
    return sortMethod(connectors);
  }, [allConnectors, filterItems]);

  const onConnectorCardSelected = useCallback(
    (id: string): void => {
      dispatch(selectOperationGroupId(id));
    },
    [dispatch]
  );

  return (
    <>
      <RuntimeFilterTagList filters={filters} setFilters={setFilters} />
      <BrowseGrid
        onConnectorSelected={onConnectorCardSelected}
        operationsData={sortedConnectors}
        isLoading={isLoading}
        displayRuntimeInfo={displayRuntimeInfo}
        isConnector={true}
      />
    </>
  );
};

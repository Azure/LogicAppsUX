import { useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService, getRecordEntry, type Connector } from '@microsoft/logic-apps-shared';
import { BrowseGrid, isBuiltInConnector, isCustomConnector, RuntimeFilterTagList } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';
import { useAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useShouldEnableACASession } from './hooks';

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
  const isAgenticWorkflow = useAgenticWorkflow();
  const isRoot = useDiscoveryPanelRelationshipIds().graphId === 'root';
  const shouldEnableACASession = useShouldEnableACASession();

  const dispatch = useDispatch();

  const { data: allConnectors, isLoading } = useAllConnectors();

  const isAgentConnectorAllowed = useCallback(
    (connector: Connector): boolean => {
      return !((!isAgenticWorkflow || !isRoot) && connector.id === 'connectionProviders/agent');
    },
    [isAgenticWorkflow, isRoot]
  );

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

      // Filter based on specific action type
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

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      return (
        isAgentConnectorAllowed(connector) &&
        isACASessionAllowed(connector) &&
        passesRuntimeFilter(connector) &&
        passesActionTypeFilter(connector)
      );
    },
    [isAgentConnectorAllowed, isACASessionAllowed, passesRuntimeFilter, passesActionTypeFilter]
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

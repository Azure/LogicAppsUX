import { useAllApiIdsWithActions, useAllApiIdsWithTriggers, useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService, cleanConnectorId, type Connector } from '@microsoft/logic-apps-shared';
import { BrowseGrid, isBuiltInConnector, isCustomConnector } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

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
  !connector.id.startsWith('/subscriptions/') && console.log(`pvalue: ${connector.id.toLowerCase()} : ${t}`);
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
  isLoadingOperations: boolean;
  displayRuntimeInfo: boolean;
}

export const BrowseView = (props: BrowseViewProps) => {
  const { filters, isLoadingOperations, displayRuntimeInfo } = props;

  const dispatch = useDispatch();

  const { data: allConnectors, isLoading } = useAllConnectors();

  const allApiIdsWithActions = useAllApiIdsWithActions();
  const allApiIdsWithTriggers = useAllApiIdsWithTriggers();

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      if (filters['runtime']) {
        const filterMethod = SearchService().filterConnector?.bind(SearchService()) || defaultFilterConnector;
        if (!filterMethod(connector, filters['runtime'])) {
          return false;
        }
      }

      if (filters['actionType'] && (allApiIdsWithActions.data.length > 0 || allApiIdsWithTriggers.data.length > 0)) {
        const capabilities = connector.properties?.capabilities ?? [];
        const ignoreCapabilities = !capabilities.includes('triggers') && !capabilities.includes('actions');
        const connectorId = cleanConnectorId(connector.id);
        const supportsActions = (ignoreCapabilities || capabilities.includes('actions')) && allApiIdsWithActions.data.includes(connectorId);
        const supportsTriggers =
          (ignoreCapabilities || capabilities.includes('triggers')) && allApiIdsWithTriggers.data.includes(connectorId);
        if (filters['actionType'].toLowerCase() === 'triggers' && !supportsTriggers) {
          return false;
        }
        if (filters['actionType'].toLowerCase() === 'actions' && !supportsActions) {
          return false;
        }
      }

      return true;
    },
    [filters, allApiIdsWithActions, allApiIdsWithTriggers]
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
    <BrowseGrid
      onConnectorSelected={onConnectorCardSelected}
      connectors={sortedConnectors}
      isLoading={isLoading || isLoadingOperations}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

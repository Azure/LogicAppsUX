import { useAllApiIdsWithActions, useAllApiIdsWithTriggers, useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService } from '@microsoft/logic-apps-designer';
import { BrowseGrid } from '@microsoft/logic-apps-designer';
import { isBuiltInConnector, type Connector, isCustomConnector } from '@microsoft/logic-apps-designer';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

const defaultFilterConnector = (connector: Connector, runtimeFilter: string): boolean => {
  if (runtimeFilter === 'inapp' && !isBuiltInConnector(connector.id)) return false;
  else if (runtimeFilter === 'custom' && !isCustomConnector(connector.id)) return false;
  else if (runtimeFilter === 'shared') if (isBuiltInConnector(connector.id) || isCustomConnector(connector.id)) return false;
  return true;
};

const defaultSortConnectors = (connectors: Connector[]): Connector[] => {
  return connectors.sort((a, b) => a.properties.displayName.localeCompare(b.properties.displayName));
};

export const BrowseView = ({
  filters,
  isLoadingOperations,
  displayRuntimeInfo,
}: {
  filters: Record<string, string>;
  isLoadingOperations: boolean;
  displayRuntimeInfo: boolean;
}) => {
  const dispatch = useDispatch();

  const { data: allConnectors, isLoading } = useAllConnectors();

  const allApiIdsWithActions = useAllApiIdsWithActions();
  const allApiIdsWithTriggers = useAllApiIdsWithTriggers();

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      if (filters['runtime']) {
        const filterMethod = SearchService().filterConnector?.bind(SearchService()) || defaultFilterConnector;
        if (!filterMethod(connector, filters['runtime'])) return false;
      }

      if (filters['actionType'] && (allApiIdsWithActions.data.length > 0 || allApiIdsWithTriggers.data.length > 0)) {
        const capabilities = connector.properties?.capabilities ?? [];
        const ignoreCapabilities = capabilities.length === 0;
        const supportsActions =
          (ignoreCapabilities || capabilities.includes('actions')) && allApiIdsWithActions.data.includes(connector.id);
        const supportsTriggers =
          (ignoreCapabilities || capabilities.includes('triggers')) && allApiIdsWithTriggers.data.includes(connector.id);
        if (filters['actionType'].toLowerCase() === 'triggers' && !supportsTriggers) return false;
        else if (filters['actionType'].toLowerCase() === 'actions' && !supportsActions) return false;
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

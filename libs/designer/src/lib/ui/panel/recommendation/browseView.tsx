import { useAllApiIdsWithActions, useAllApiIdsWithTriggers, useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService2 } from '@microsoft/designer-client-services-logic-apps';
import { BrowseGrid } from '@microsoft/designer-ui';
import type { Connector } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

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
        if (!SearchService2([]).filterConnector(connector, filters['runtime'])) return false;
      }

      if (filters['actionType']) {
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
    return connectors.sort((a, b) => a.properties.displayName.localeCompare(b.properties.displayName));
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

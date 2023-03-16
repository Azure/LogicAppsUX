import { useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { BrowseGrid } from '@microsoft/designer-ui';
import type { Connector } from '@microsoft/utils-logic-apps';
import { isCustomConnector, isBuiltInConnector } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

export const BrowseView = ({ filters }: { filters: Record<string, string> }) => {
  const dispatch = useDispatch();

  const { data: allConnectors, isLoading } = useAllConnectors();

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      if (filters['runtime']) {
        if (filters['runtime'] === 'inapp' && !isBuiltInConnector(connector.id)) return false;
        else if (filters['runtime'] === 'custom' && !isCustomConnector(connector.id)) return false;
        else if (filters['runtime'] === 'shared') if (isBuiltInConnector(connector.id) || isCustomConnector(connector.id)) return false;
      }

      if (filters['actionType']) {
        const capabilities = connector.properties?.capabilities ?? [];
        const supportsActions = capabilities.includes('actions');
        const supportsTriggers = capabilities.includes('triggers');
        if (filters['actionType'].toLowerCase() === 'triggers' && !supportsTriggers) return false;
        else if (filters['actionType'].toLowerCase() === 'actions' && !supportsActions) return false;
      }

      return true;
    },
    [filters]
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

  return <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectors={sortedConnectors} isLoading={isLoading} />;
};

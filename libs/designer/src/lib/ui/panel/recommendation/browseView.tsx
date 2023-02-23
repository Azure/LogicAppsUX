import { useAllConnectors, useAllOperations, useTriggerCapabilities } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { BrowseGrid } from '@microsoft/designer-ui';
import type { Connector } from '@microsoft/utils-logic-apps';
import { isCustomConnector, isBuiltInConnector } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const BrowseView = ({ filters }: { filters: Record<string, string> }) => {
  const dispatch = useDispatch();

  const intl = useIntl();

  const { data: allOperations, isLoading: operationsLoading } = useAllOperations();
  const allConnectors = useAllConnectors();

  const { data: triggerCapabilities } = useTriggerCapabilities(allOperations);

  const filterItems = useCallback(
    (connector: Connector): boolean => {
      if (filters['runtime']) {
        if (filters['runtime'] === 'inapp' && !isBuiltInConnector(connector.id)) return false;
        else if (filters['runtime'] === 'custom' && !isCustomConnector(connector.id)) return false;
        else if (filters['runtime'] === 'shared') if (isBuiltInConnector(connector.id) || isCustomConnector(connector.id)) return false;
      }

      if (filters['actionType']) {
        const { action, trigger } = triggerCapabilities?.[connector.id.toLowerCase()] ?? {};
        if (!action && !trigger) return true; // some connectors don't have any capabilities set, we'll just show those regardless
        if (filters['actionType'].toLowerCase() === 'triggers' && !trigger) return false;
        else if (filters['actionType'].toLowerCase() === 'actions' && !action) return false;
      }

      return true;
    },
    [filters, triggerCapabilities]
  );

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connectors...',
    description: 'Message to show under the loading icon when loading connectors',
  });

  if (allConnectors.isLoading || operationsLoading) {
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );
  }

  const connectors = allConnectors.data?.filter(filterItems) ?? [];
  connectors.sort((a, b) => a.properties.displayName.localeCompare(b.properties.displayName));

  const onConnectorCardSelected = (id: string): void => {
    dispatch(selectOperationGroupId(id));
  };

  return <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectorBrowse={connectors} />;
};

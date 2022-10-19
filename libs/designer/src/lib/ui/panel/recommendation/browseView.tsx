import { useAllConnectors, useAllOperations, useTriggerCapabilities } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { Connector } from '@microsoft-logic-apps/utils';
import { isBuiltInConnector } from '@microsoft-logic-apps/utils';
import { BrowseGrid } from '@microsoft/designer-ui';
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
      let ret = true;
      if (filters['runtime']) {
        if (filters['runtime'] === 'inapp') {
          ret = isBuiltInConnector(connector.id);
        } else {
          ret = !isBuiltInConnector(connector.id);
        }
      }
      if (filters['actionType']) {
        let hasAMatchingActionType = false;
        if (filters['actionType'].toLowerCase() === 'triggers') {
          hasAMatchingActionType = triggerCapabilities?.[connector.id.toLowerCase()]?.trigger ?? false;
        } else {
          hasAMatchingActionType = triggerCapabilities?.[connector.id.toLowerCase()]?.action ?? false;
        }
        ret = ret && hasAMatchingActionType;
      }
      return ret;
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

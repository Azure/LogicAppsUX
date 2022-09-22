import { useAllConnectors } from '../../../core/queries/browse';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { BrowseGrid } from '@microsoft/designer-ui';
import React from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const BrowseView: React.FC = () => {
  const dispatch = useDispatch();

  const intl = useIntl();

  const allConnectors = useAllConnectors();
  const connectors = allConnectors.data ?? [];
  connectors.sort((a, b) => a.properties.displayName.localeCompare(b.properties.displayName));

  const onConnectorCardSelected = (id: string): void => {
    dispatch(selectOperationGroupId(id));
  };

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connectors...',
    description: 'Message to show under the loading icon when loading connectors',
  });

  if (allConnectors.isLoading)
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );

  return <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectorBrowse={connectors} />;
};

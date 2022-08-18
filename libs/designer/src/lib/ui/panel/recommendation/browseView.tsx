import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { BrowseGrid } from '@microsoft/designer-ui';
import React from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

export const BrowseView: React.FC = () => {
  const dispatch = useDispatch();

  const intl = useIntl();

  const browseResponse = useQuery(
    ['browseResult'],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getAllConnectors();
    },
    {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
    }
  );

  const browseResults = browseResponse.data;

  const onConnectorCardSelected = (id: string): void => {
    dispatch(selectOperationGroupId(id));
  };

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connectors...',
    description: 'Message to show under the loading icon when loading connectors',
  });

  if (browseResponse.isLoading)
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );

  return <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectorBrowse={browseResults || []} />;
};

import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { BrowseGrid } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

export const BrowseView: React.FC = () => {
  const dispatch = useDispatch();

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

  return <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectorBrowse={browseResults || []} />;
};

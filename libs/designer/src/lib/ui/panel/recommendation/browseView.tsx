//import { getAllOperationsForGroup } from '../../../core/queries/browse';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { BrowseGrid, ConnectorAllOperationsSummary } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';

const getBrowseResult = () => {
  const connectionService = ConnectionService();
  const connections = connectionService.getAllConnectors();
  return connections;
};

export const BrowseView: React.FC = () => {
  const [selectedConnectorId, setSelectedConnectorId] = React.useState('');
  const browseResponse = useQuery(['browseResult'], () => getBrowseResult(), {
    staleTime: 1000000,
    cacheTime: 10000 * 60 * 5, // Danielle this is temporary, will move to config
  });
  const browseResults = browseResponse.data;

  // const allOperationsForGroup = useQuery(
  //   ['browseViewOperationsForGroup', selectedConnectorId],
  //   () => getAllOperationsForGroup(selectedConnectorId),
  //   {
  //     enabled: selectedConnectorId !== '',
  //     staleTime: 100000,
  //     cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  //   }
  // );

  const onConnectorCardSelected = (id: string): void => {
    setSelectedConnectorId(id);
    // Danielle how do I not pass this down so many components
    console.log(id);
  };

  return (
    <>
      {selectedConnectorId !== '' ? (
        <ConnectorAllOperationsSummary operations={[]}></ConnectorAllOperationsSummary>
      ) : (
        <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectorBrowse={browseResults || []}></BrowseGrid>
      )}
    </>
  );
};

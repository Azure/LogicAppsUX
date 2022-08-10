import { OperationGroupDetailView } from './operationGroupDetailView';
import { ConnectionService, SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { BrowseGrid } from '@microsoft/designer-ui';
import React, { useEffect } from 'react';
import { useQuery } from 'react-query';

const getBrowseResult = () => {
  const connectionService = ConnectionService();
  const connections = connectionService.getAllConnectors();
  return connections;
};

export const BrowseView: React.FC = () => {
  const [selectedConnectorId, setSelectedConnectorId] = React.useState('');
  const [allOperationsForGroup, setAllOperationsForGroup] = React.useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);

  const browseResponse = useQuery(['browseResult'], () => getBrowseResult(), {
    staleTime: 1000000,
    cacheTime: 10000 * 60 * 5, // Danielle this is temporary, will move to config
  });
  const browseResults = browseResponse.data;

  const allOperations = useQuery(
    ['allOperations'],
    () => {
      const searchService = SearchService();
      return searchService.preloadOperations();
    },
    {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
    }
  );

  useEffect(() => {
    if (allOperations.data && selectedConnectorId) {
      const filteredOps = allOperations.data.filter((operation) => operation.properties.api.id === selectedConnectorId);
      setAllOperationsForGroup(filteredOps);
    }
  }, [selectedConnectorId, allOperations]);

  const onConnectorCardSelected = (id: string): void => {
    setSelectedConnectorId(id);
    // Danielle how do I not pass this down so many components
    console.log(id);
  };

  return (
    <>
      {selectedConnectorId !== '' ? (
        <OperationGroupDetailView selectedSearchedOperations={allOperationsForGroup}></OperationGroupDetailView>
      ) : (
        <BrowseGrid onConnectorSelected={onConnectorCardSelected} connectorBrowse={browseResults || []} />
      )}
    </>
  );
};

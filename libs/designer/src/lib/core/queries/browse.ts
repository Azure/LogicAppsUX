import { ConnectionService, SearchService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';

export const getAllOperationsForGroup = (connectorId: string) => {
  const connectionService = ConnectionService();
  const operations = connectionService.getAllOperationsForGroup(connectorId);
  return operations;
};

export const useAllOperations = () => {
  return useQuery(
    ['allOperations'],
    () => {
      const searchService = SearchService();
      return searchService.preloadOperations();
    },
    {
      retry: false,
      cacheTime: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useAllConnectors = () => {
  return useQuery(
    ['browseResult'],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getAllConnectors();
    },
    {
      retry: false,
      cacheTime: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';

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
      return SearchService().getAllConnectors();
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

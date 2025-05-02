import { CognitiveServiceService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const queryKeys = {
  allCognitiveServiceAccounts: 'allCognitiveServiceAccounts',
};

export const useAllCognitiveServiceAccounts = () => {
  return useQuery(
    [queryKeys.allCognitiveServiceAccounts],
    async () => {
      const allCognitiveServiceAccounts = await CognitiveServiceService().fetchAllCognitiveServiceAccounts();
      return allCognitiveServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: true,
    }
  );
};

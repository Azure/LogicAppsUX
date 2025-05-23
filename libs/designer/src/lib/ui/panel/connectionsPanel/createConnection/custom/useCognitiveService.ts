import { CognitiveServiceService, foundryServiceConnectionRegex } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { isAgentConnector } from '../../../../../common/utilities/Utils';
import { useSelectedConnection } from '../../../../../core/state/connection/connectionSelector';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const queryKeys = {
  allCognitiveServiceAccounts: 'allCognitiveServiceAccounts',
  allCognitiveServiceAccountsDeployments: 'allCognitiveServiceAccountsDeployments',
};

export const useAllCognitiveServiceAccounts = (subscriptionId: string) => {
  return useQuery(
    [queryKeys.allCognitiveServiceAccounts, { subscriptionId }],
    async () => {
      const allCognitiveServiceAccounts = await CognitiveServiceService().fetchAllCognitiveServiceAccounts(subscriptionId);
      return allCognitiveServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId,
    }
  );
};

export const useCognitiveServiceAccountDeploymentsForNode = (nodeId: string, connectorId?: string) => {
  const selectedConnection = useSelectedConnection(nodeId);
  const resourceId = selectedConnection?.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value;
  const isFoundryServiceConnection = foundryServiceConnectionRegex.test(resourceId ?? '');
  const serviceAccountId = isFoundryServiceConnection ? resourceId?.split('/').slice(0, -2).join('/') : resourceId;
  return useQuery(
    [queryKeys.allCognitiveServiceAccountsDeployments, { serviceAccountId }],
    async () => {
      if (serviceAccountId) {
        return await CognitiveServiceService().fetchAllCognitiveServiceAccountDeployments(serviceAccountId);
      }

      return [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: isAgentConnector(connectorId) && !!serviceAccountId,
    }
  );
};

export const useAllCognitiveServiceProjects = (serviceAccountId: string) => {
  return useQuery(
    [queryKeys.allCognitiveServiceAccounts, { serviceAccountId }],
    async () => {
      const allCognitiveServiceAccounts = await CognitiveServiceService().fetchAllCognitiveServiceProjects(serviceAccountId);
      return allCognitiveServiceAccounts?.value ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!serviceAccountId,
    }
  );
};

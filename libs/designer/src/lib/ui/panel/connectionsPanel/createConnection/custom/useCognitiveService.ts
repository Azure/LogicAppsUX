import type { Connection } from '@microsoft/logic-apps-shared';
import { ApiManagementService, CognitiveServiceService, ResourceService, foundryServiceConnectionRegex } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { useSelectedConnection } from '../../../../../core/state/connection/connectionSelector';
import { getReactQueryClient } from '../../../../../core';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const queryKeys = {
  allCognitiveServiceAccounts: 'allCognitiveServiceAccounts',
  allCognitiveServiceAccountsDeployments: 'allCognitiveServiceAccountsDeployments',
  allSessionPoolAccounts: 'allSessionPoolAccounts',
  allBuiltInRoleDefinitions: 'allBuiltInRoleDefinitions',
  allAPIMServiceAccounts: 'allAPIMServiceAccounts',
  allAPIMServiceAccountApis: 'allAPIMServiceAccountApis',
};

export const useAllAPIMServiceAccounts = (subscriptionId: string, enabled = true) => {
  return useQuery(
    [queryKeys.allAPIMServiceAccounts, { subscriptionId }],
    async () => {
      const allAPIMServiceAccounts = await ApiManagementService().fetchApiManagementInstances(subscriptionId);
      return allAPIMServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId && enabled,
    }
  );
};

export const useAllAPIMServiceAccountsApis = (accountId: string, enabled = true) => {
  return useQuery(
    [queryKeys.allAPIMServiceAccountApis, { accountId }],
    async () => {
      const allAPIMServiceAccounts = await ApiManagementService().fetchApisInApiM(accountId);
      return allAPIMServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!accountId && enabled,
    }
  );
};

export const useAllCognitiveServiceAccounts = (subscriptionId: string, enabled = true) => {
  return useQuery(
    [queryKeys.allCognitiveServiceAccounts, { subscriptionId }],
    async () => {
      const allCognitiveServiceAccounts = await CognitiveServiceService().fetchAllCognitiveServiceAccounts(subscriptionId);
      return allCognitiveServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId && enabled,
    }
  );
};

const getServiceAccountId = (resourceId: string | undefined, isFoundryServiceConnection: boolean) => {
  if (!resourceId) {
    return undefined;
  }

  if (isFoundryServiceConnection) {
    const parts = resourceId.split('/');
    return parts.length >= 2 ? parts.slice(0, -2).join('/') : resourceId;
  }

  return resourceId;
};

export const getCognitiveServiceAccountDeploymentsForConnection = async (connection: Connection) => {
  const queryClient = getReactQueryClient();
  const resourceId = connection?.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value;
  const isFoundryServiceConnection = foundryServiceConnectionRegex.test(resourceId ?? '');
  const serviceAccountId = getServiceAccountId(resourceId, isFoundryServiceConnection);

  return queryClient.fetchQuery([queryKeys.allCognitiveServiceAccountsDeployments, { serviceAccountId }], async () => {
    if (serviceAccountId) {
      return await CognitiveServiceService().fetchAllCognitiveServiceAccountDeployments(serviceAccountId);
    }

    return [];
  });
};

export const useCognitiveServiceAccountId = (nodeId: string, _connectorId?: string) => {
  const selectedConnection = useSelectedConnection(nodeId);
  const resourceId = selectedConnection?.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value;
  const isFoundryServiceConnection = foundryServiceConnectionRegex.test(resourceId ?? '');
  return getServiceAccountId(resourceId, isFoundryServiceConnection);
};

export const useCognitiveServiceAccountDeploymentsForNode = (nodeId: string, connectorId?: string) => {
  const serviceAccountId = useCognitiveServiceAccountId(nodeId, connectorId);
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
      refetchOnMount: true,
      refetchOnReconnect: true,
      enabled: !!serviceAccountId,
    }
  );
};

export const useAllCognitiveServiceProjects = (subscriptionId: string, enabled = true) => {
  return useQuery(
    [queryKeys.allCognitiveServiceAccounts, { subscriptionId }],
    async () => {
      const allCognitiveServiceAccounts = await CognitiveServiceService().fetchAllCognitiveServiceProjects(subscriptionId);
      return allCognitiveServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId && enabled,
    }
  );
};

export const useAllSessionPoolAccounts = (subscriptionId: string) => {
  return useQuery(
    [queryKeys.allSessionPoolAccounts, { subscriptionId }],
    async () => {
      const allSessionPoolAccounts = await CognitiveServiceService().fetchAllSessionPoolAccounts(subscriptionId);
      return allSessionPoolAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId,
    }
  );
};

export const useAllBuiltInRoleDefinitions = () => {
  return useQuery(
    [queryKeys.allBuiltInRoleDefinitions],
    async () => {
      const allBuiltInRoleDefinitions = await CognitiveServiceService().fetchBuiltInRoleDefinitions();
      return allBuiltInRoleDefinitions ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
    }
  );
};

export const useAllCosmosDbServiceAccounts = (subscriptionId: string, enabled = true) => {
  return useQuery(
    ['allCosmosDbServiceAccounts', { subscriptionId }],
    async () => {
      const allCosmosDbServiceAccounts = await ResourceService().listResources(subscriptionId, `resources | where type =~ 'Microsoft.DocumentDB/databaseAccounts' | where properties.provisioningState =~ 'Succeeded' | extend capabilities = todynamic(properties.capabilities) | mv-apply capabilities on ( mv-expand capabilities | extend capabilityName = tostring(capabilities.name) | where capabilityName =~ 'EnableNoSQLVectorSearch')`);
      return allCosmosDbServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId && enabled,
    }
  );
};

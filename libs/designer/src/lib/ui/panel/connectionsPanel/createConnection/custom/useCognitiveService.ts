import type { Connection, FoundryAgent, FoundryAgentVersion, FoundryModel } from '@microsoft/logic-apps-shared';
import {
  ApiManagementService,
  CognitiveServiceService,
  ResourceService,
  foundryServiceConnectionRegex,
  buildProjectEndpointFromResourceId,
  listAllFoundryAgents,
  listFoundryAgentVersions,
  listFoundryModels,
} from '@microsoft/logic-apps-shared';
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
  allFoundryAgents: 'allFoundryAgents',
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
      const allCosmosDbServiceAccounts = await ResourceService().listResources(
        subscriptionId,
        `resources | where type =~ 'Microsoft.DocumentDB/databaseAccounts' | where properties.provisioningState =~ 'Succeeded' | extend capabilities = todynamic(properties.capabilities) | mv-apply capabilities on ( mv-expand capabilities | extend capabilityName = tostring(capabilities.name) | where capabilityName =~ 'EnableNoSQLVectorSearch')`
      );
      return allCosmosDbServiceAccounts ?? [];
    },
    {
      ...queryOpts,
      retryOnMount: true,
      enabled: !!subscriptionId && enabled,
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  );
};
/**
 * Extracts the Foundry project resource ID from a node's selected connection.
 * Returns undefined if the connection is not a Foundry connection.
 */
const useFoundryConnectionResourceId = (nodeId: string): string | undefined => {
  const selectedConnection = useSelectedConnection(nodeId);
  const resourceId = selectedConnection?.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value;
  const isFoundry = foundryServiceConnectionRegex.test(resourceId ?? '');
  return isFoundry ? resourceId : undefined;
};

/**
 * Returns the httpClient and a getToken function from the CognitiveServiceService,
 * or undefined if either is unavailable (e.g. VS Code environment).
 */
function getFoundryServiceContext():
  | {
      httpClient: NonNullable<ReturnType<typeof CognitiveServiceService>['httpClient']>;
      getToken: NonNullable<ReturnType<typeof CognitiveServiceService>['getFoundryAccessToken']>;
    }
  | undefined {
  const service = CognitiveServiceService();
  const getToken = service.getFoundryAccessToken;
  const httpClient = service.httpClient;
  if (!getToken || !httpClient) {
    return undefined;
  }
  return { httpClient, getToken };
}

const foundryQueryOpts = {
  ...queryOpts,
  retryOnMount: true,
  refetchOnMount: true,
  refetchOnReconnect: true,
};

/** Returns the Foundry project endpoint for a node's selected connection. */
export const useFoundryProjectEndpointForNode = (nodeId: string): string | undefined => {
  const resourceId = useFoundryConnectionResourceId(nodeId);
  return resourceId ? buildProjectEndpointFromResourceId(resourceId) : undefined;
};

/** Returns the full ARM resource ID for the Foundry project connection, used for portal URLs. */
export const useFoundryProjectResourceIdForNode = (nodeId: string): string | undefined => {
  return useFoundryConnectionResourceId(nodeId);
};

/** Fetches all v2 Foundry agents for the node's selected connection. */
export const useFoundryAgentsForNode = (nodeId: string): { data: FoundryAgent[] | undefined; isLoading: boolean; error: unknown } => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);

  return useQuery(
    [queryKeys.allFoundryAgents, { projectEndpoint }],
    async () => {
      if (!projectEndpoint) {
        return [];
      }
      const ctx = getFoundryServiceContext();
      if (!ctx) {
        return [];
      }
      const token = await ctx.getToken();
      return listAllFoundryAgents(ctx.httpClient, projectEndpoint, token);
    },
    { ...foundryQueryOpts, enabled: !!projectEndpoint }
  );
};

/** Returns the ARM resource ID of the Foundry account (without /projects/{project}) for a node's connection. */
export const useFoundryAccountResourceIdForNode = (nodeId: string): string | undefined => {
  const resourceId = useFoundryConnectionResourceId(nodeId);
  return resourceId ? getServiceAccountId(resourceId, true) : undefined;
};

/** Fetches available model deployments for the Foundry project connected to the node. */
export const useFoundryModelsForNode = (nodeId: string): { data: FoundryModel[] | undefined; isLoading: boolean; error: unknown } => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);

  return useQuery(
    ['allFoundryModels', { projectEndpoint }],
    async () => {
      if (!projectEndpoint) {
        return [];
      }
      const ctx = getFoundryServiceContext();
      if (!ctx) {
        return [];
      }
      const token = await ctx.getToken();
      return listFoundryModels(ctx.httpClient, projectEndpoint, token);
    },
    { ...foundryQueryOpts, enabled: !!projectEndpoint }
  );
};

/** Fetches all versions of a specific Foundry agent. */
export const useFoundryAgentVersions = (
  nodeId: string,
  agentId: string | undefined
): { data: FoundryAgentVersion[] | undefined; isLoading: boolean; error: unknown } => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);
  const projectResourceId = useFoundryProjectResourceIdForNode(nodeId);

  return useQuery(
    ['foundryAgentVersions', { projectEndpoint, agentId }],
    async () => {
      if (!projectEndpoint || !agentId) {
        return [];
      }
      const ctx = getFoundryServiceContext();
      if (!ctx) {
        return [];
      }
      const token = await ctx.getToken();
      return listFoundryAgentVersions(ctx.httpClient, projectEndpoint, agentId, token, projectResourceId);
    },
    { ...foundryQueryOpts, enabled: !!projectEndpoint && !!agentId }
  );
};

import type {
  Connection,
  CreateFoundryAgentOptions,
  FoundryAgent,
  FoundryAgentVersion,
  FoundryModel,
  IHttpClient,
} from '@microsoft/logic-apps-shared';
import {
  ApiManagementService,
  CognitiveServiceService,
  ResourceService,
  buildProjectEndpointFromResourceId,
  createFoundryAgentViaProxy,
  foundryServiceConnectionRegex,
  listAllFoundryAgentsViaProxy,
  listFoundryAgentVersionsViaProxy,
  listFoundryModelsViaProxy,
} from '@microsoft/logic-apps-shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  // Strip /models suffix for MicrosoftFoundry connections
  return resourceId.replace(/\/models$/, '');
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

export interface CosmosDbAccount {
  id: string;
  name: string;
  resourceGroup: string;
  subscriptionId: string;
  endpoint: string;
}
export const useAllCosmosDbServiceAccounts = (subscriptionId: string, enabled = true) => {
  return useQuery(
    ['allCosmosDbServiceAccounts', { subscriptionId }],
    async (): Promise<CosmosDbAccount[]> => {
      const allCosmosDbServiceAccounts = await ResourceService().listResources(
        subscriptionId,
        `resources | where type =~ 'Microsoft.DocumentDB/databaseAccounts' | where properties.provisioningState =~ 'Succeeded' | where array_length(todynamic(properties.capabilities)) > 0 | extend capabilities = tostring(properties.capabilities) | where capabilities contains 'EnableNoSQLVectorSearch'`
      );
      return (allCosmosDbServiceAccounts ?? []).map((account: any) => ({
        id: account.id,
        name: account.name,
        resourceGroup: account.resourceGroup,
        subscriptionId,
        endpoint: account.properties.documentEndpoint,
      }));
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
 * Returns the proxy context (httpClient + proxyBaseUrl) from the CognitiveServiceService.
 * All Foundry calls go through the backend proxy which handles auth via MSI.
 */
function getFoundryProxyContext(): { httpClient: IHttpClient; proxyBaseUrl: string } | undefined {
  const { foundryProxyBaseUrl, httpClient } = CognitiveServiceService();
  if (!foundryProxyBaseUrl || !httpClient) {
    return undefined;
  }
  return { httpClient, proxyBaseUrl: foundryProxyBaseUrl };
}

/** Build a FoundryProxyContext for a given project endpoint, or return undefined if not configured. */
function buildProxyContext(
  projectEndpoint: string | undefined
): { httpClient: IHttpClient; proxyBaseUrl: string; foundryEndpoint: string } | undefined {
  if (!projectEndpoint) {
    return undefined;
  }
  const proxy = getFoundryProxyContext();
  if (!proxy) {
    return undefined;
  }
  return { ...proxy, foundryEndpoint: projectEndpoint };
}

/**
 * Detects whether an error from a Foundry proxy call is an auth/permission error (401/403).
 * These are expected during RBAC propagation and should trigger extended retries.
 */
const AUTH_ERROR_PATTERN = /unauthorized|permissiondenied|forbidden/i;

export function isFoundryAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const e = error as Record<string, unknown>;
  const status = e.httpStatusCode ?? e.status ?? e.statusCode;
  if (status === 401 || status === 403) {
    return true;
  }
  const code = String(e.code ?? e.Code ?? '');
  const message = String(e.message ?? e.Message ?? '');
  return AUTH_ERROR_PATTERN.test(code) || AUTH_ERROR_PATTERN.test(message);
}

const foundryQueryOpts = {
  ...queryOpts,
  retryOnMount: true,
  refetchOnMount: true,
  refetchOnReconnect: true,
  retry: (failureCount: number, error: unknown) => {
    // Retry indefinitely on auth errors — RBAC propagation can take 30s–5min.
    // The user can manually refresh via the 🔄 button at any time.
    if (isFoundryAuthError(error)) {
      return true;
    }
    return failureCount < 3;
  },
  retryDelay: (attempt: number, error: unknown) => {
    if (isFoundryAuthError(error)) {
      // Exponential backoff capped at 30s: 3s, 6s, 12s, 24s, 30s, 30s...
      return Math.min(3000 * 2 ** attempt, 30_000);
    }
    return Math.min(1000 * 2 ** attempt, 10_000);
  },
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

/** Fetches all v2 Foundry agents for the node's selected connection via the backend proxy. */
export const useFoundryAgentsForNode = (
  nodeId: string,
  rbacReady = true
): {
  data: FoundryAgent[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
} => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);

  const { data, isLoading, isFetching, error, refetch } = useQuery(
    [queryKeys.allFoundryAgents, { projectEndpoint }],
    async () => {
      const ctx = buildProxyContext(projectEndpoint);
      return ctx ? listAllFoundryAgentsViaProxy(ctx) : [];
    },
    { ...foundryQueryOpts, enabled: !!projectEndpoint && rbacReady }
  );
  return { data, isLoading, isFetching, error, refetch };
};

/** Returns the ARM resource ID of the Foundry account (without /projects/{project}) for a node's connection. */
export const useFoundryAccountResourceIdForNode = (nodeId: string): string | undefined => {
  const resourceId = useFoundryConnectionResourceId(nodeId);
  return resourceId ? getServiceAccountId(resourceId, true) : undefined;
};

/** Fetches available model deployments for the Foundry project connected to the node via the backend proxy. */
export const useFoundryModelsForNode = (
  nodeId: string,
  rbacReady = true
): { data: FoundryModel[] | undefined; isLoading: boolean; error: unknown } => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);

  return useQuery(
    ['allFoundryModels', { projectEndpoint }],
    async () => {
      const ctx = buildProxyContext(projectEndpoint);
      return ctx ? listFoundryModelsViaProxy(ctx) : [];
    },
    { ...foundryQueryOpts, enabled: !!projectEndpoint && rbacReady }
  );
};

/** Fetches all versions of a specific Foundry agent via the backend proxy. */
export const useFoundryAgentVersions = (
  nodeId: string,
  agentId: string | undefined
): { data: FoundryAgentVersion[] | undefined; isLoading: boolean; error: unknown } => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);

  return useQuery(
    ['foundryAgentVersions', { projectEndpoint, agentId }],
    async () => {
      if (!agentId) {
        return [];
      }
      const ctx = buildProxyContext(projectEndpoint);
      return ctx ? listFoundryAgentVersionsViaProxy(ctx, agentId) : [];
    },
    { ...foundryQueryOpts, enabled: !!projectEndpoint && !!agentId }
  );
};

/** Creates a new Foundry agent via the backend proxy and refreshes the agents list. */
export const useCreateFoundryAgent = (nodeId: string) => {
  const projectEndpoint = useFoundryProjectEndpointForNode(nodeId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: CreateFoundryAgentOptions) => {
      const ctx = buildProxyContext(projectEndpoint);
      if (!ctx) {
        throw new Error('Foundry proxy not configured');
      }
      return createFoundryAgentViaProxy(ctx, options);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKeys.allFoundryAgents] });
    },
  });
};

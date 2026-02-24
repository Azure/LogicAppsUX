import {
  type Resource,
  ResourceService,
  type LogicAppResource,
  equals,
  type McpServer,
  getObjectPropertyValue,
  LoggerService,
  LogEntryLevel,
  getPropertyValue,
} from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAzureConnectorsLazyQuery } from '../../../core/queries/browse';
import { useMemo } from 'react';
import { SearchService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { workflowAppConnectionsKey } from '../../configuretemplate/utils/queries';
import { getStandardLogicAppId } from '../../configuretemplate/utils/helper';
import { isHttpRequestTrigger } from './helper';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const useAllMcpServers = (siteResourceId: string) => {
  return useQuery({
    queryKey: ['mcpservers', siteResourceId.toLowerCase()],
    queryFn: async (): Promise<McpServer[]> => {
      try {
        const response: any = await ResourceService().executeResourceAction(
          `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServers`,
          'POST',
          { 'api-version': '2024-11-01' }
        );

        return (response.value ?? [])
          .map((server: McpServer) => ({
            ...server,
            enabled: server.enabled === undefined ? true : server.enabled,
          }))
          .sort((a: McpServer, b: McpServer) => a.name.localeCompare(b.name));
      } catch (errorResponse: any) {
        const error = errorResponse?.error || {};

        if (equals(error.code, 'McpServerNotEnabled')) {
          return [];
        }

        // For now log the error and return empty list
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'McpServer.listServers',
          error,
          message: `Error while fetching mcp servers for the app: ${siteResourceId}`,
        });
        return [];
      }
    },
    enabled: !!siteResourceId,
    ...queryOpts,
  });
};

export const useAllMcpServersFromVfs = (siteResourceId: string) => {
  return useQuery({
    queryKey: ['mcpserversvfs', siteResourceId.toLowerCase()],
    queryFn: async (): Promise<string[]> => {
      try {
        const response: any = await ResourceService().getResource(`${siteResourceId}/hostruntime/admin/vfs/mcpservers.json`, {
          'api-version': '2018-11-01',
          relativepath: '1',
        });

        return (getPropertyValue(response, 'mcpServers') ?? []).map((server: McpServer) => server.name);
      } catch (errorResponse: any) {
        const error = errorResponse?.error || {};

        // For now log the error and return empty list
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'McpServer.listServersFromVfs',
          error,
          message: `Error while fetching mcp servers for the app: ${siteResourceId}`,
        });
        return [];
      }
    },
    enabled: !!siteResourceId,
    ...queryOpts,
    cacheTime: 0, // Do not cache as this is only used to validate server name uniqueness on create/edit panel
  });
};

type AuthType = 'apikey' | 'oauth2' | 'anonymous' | 'both';
export const useMcpAuthentication = (siteResourceId: string) => {
  return useQuery({
    queryKey: ['mcpauth', siteResourceId.toLowerCase()],
    queryFn: async (): Promise<AuthType | ''> => {
      const config = await getHostConfig(siteResourceId);
      const authProperty = getObjectPropertyValue(config, ['properties', 'extensions', 'workflow', 'McpServerEndpoints', 'authentication']);
      return authProperty === undefined ? '' : authProperty?.type ? authProperty.type : 'both';
    },
    enabled: !!siteResourceId,
    ...queryOpts,
  });
};

export const useMcpEligibleWorkflows = (subscriptionId: string, resourceGroup: string, logicAppName: string) => {
  return useQuery({
    queryKey: ['mcpEligibleWorkflows', subscriptionId?.toLowerCase(), resourceGroup?.toLowerCase(), logicAppName?.toLowerCase()],
    queryFn: async () => {
      const allWorkflows = await ResourceService().listWorkflowsInApp(subscriptionId, resourceGroup, logicAppName, (workflowItem: any) => {
        const trigger: any = Object.values(workflowItem.triggers).length === 1 ? Object.values(workflowItem.triggers)[0] : null;
        return trigger && isHttpRequestTrigger(trigger);
      });

      return allWorkflows.map((workflow) => workflow.name);
    },
    enabled: !!subscriptionId && !!resourceGroup && !!logicAppName,
    ...queryOpts,
  });
};

export const useAllManagedConnectors = () => {
  const { data: azureData, isFetching: azureFetching, hasNextPage: azureHasNextPage } = useAzureConnectorsLazyQuery();

  const hasNextPage = azureHasNextPage;
  const isLoading = azureFetching; // Only check if currently fetching, not if more pages exist

  const data = useMemo(() => {
    const azure = azureData?.pages.flatMap((page) => page.data) ?? [];
    return azure.filter((connector) => connector !== undefined);
  }, [azureData]);

  return useMemo(() => ({ data, isLoading, hasNextPage }), [data, isLoading, hasNextPage]);
};

export const useOperationsByConnectorQuery = (connectorId: string) =>
  useQuery({
    queryKey: ['mcpOperationsByConnector', connectorId],
    queryFn: async () => {
      if (!connectorId) {
        return [];
      }

      const operations = await SearchService().getOperationsByConnector?.(connectorId, 'actions');

      const filteredOperations =
        operations?.filter((operation) => {
          const props = operation.properties as any;

          const isWebhook = props.isWebhook ?? false;
          const isNotification = props.isNotification ?? false;

          return !isWebhook && !isNotification;
        }) ?? [];

      return filteredOperations;
    },
    enabled: !!connectorId,
    ...queryOpts,
  });

export const useEmptyLogicApps = (subscriptionId: string): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['mcp', 'logicapps', subscriptionId],
    async () => {
      return ResourceService().listLogicApps(subscriptionId, /* resourceGroup */ undefined);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!subscriptionId,
    }
  );
};

export const useStorageAccounts = (subscriptionId: string, location: string): UseQueryResult<Resource[], unknown> => {
  return useQuery(
    ['mcp', 'storageaccounts', subscriptionId, location],
    async () => {
      const query = `resources | where type =~ 'microsoft.storage/storageaccounts' | where location =~ '${location.toLowerCase()}' | project id, name, type, kind`;
      const result = await ResourceService().listResources(subscriptionId, query);
      return result.map((item: any) => ({
        id: item.id.toLowerCase(),
        name: item.name,
        displayName: equals(item.kind, 'StorageV2') ? `${item.name} (v2)` : `${item.name} (v1)`,
      }));
    },
    {
      enabled: !!subscriptionId && !!location,
    }
  );
};

export const useAppServicePlans = (subscriptionId: string, location: string): UseQueryResult<(Resource & { sku: string })[], unknown> => {
  return useQuery(
    ['mcp', 'appserviceplans', subscriptionId, location],
    async () => {
      const query = `resources | where type =~ 'microsoft.web/serverfarms' | where location =~ '${location.toLowerCase()}' | where properties.reserved == false | where properties.hyperV == false | where properties.hostingEnvironmentId == '' | project id, name, type, kind, sku | where sku.tier =~ 'WorkflowStandard'`;
      const result = await ResourceService().listResources(subscriptionId, query);
      return result.map((item: any) => ({
        id: item.id.toLowerCase(),
        name: item.name,
        displayName: `${item.name} (${item.sku.size})`,
        sku: item.sku.size,
      }));
    },
    {
      enabled: !!subscriptionId && !!location,
    }
  );
};

export const useAppInsights = (subscriptionId: string): UseQueryResult<Resource[], unknown> => {
  return useQuery(['mcp', 'appinsights', subscriptionId], async () => getAppInsights(subscriptionId), {
    enabled: !!subscriptionId,
  });
};

export const getAllAppInsights = async (subscriptionId: string): Promise<Resource[]> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['mcp', 'appinsights', subscriptionId], async () => getAppInsights(subscriptionId));
};

export const getAllWorkspaces = async (subscriptionId: string): Promise<(Resource & { resourceGroup: string })[]> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['mcp', 'workspaces', subscriptionId], async () => {
    const query = `resources | where type =~ 'microsoft.operationalinsights/workspaces' | project id, name, type, location, resourceGroup`;
    return ResourceService().listResources(subscriptionId, query);
  });
};

export const getRegionMappings = async (): Promise<Record<string, { geo: string; pairedRegions: string[]; laRegionCode: string }>> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['mcp', 'regionMappings'], async () => {
    try {
      const result = await ResourceService().executeHttpCall('https://appinsights.azureedge.net/portal/regionMapping.json', 'GET');
      return result.regions;
    } catch {
      return {};
    }
  });
};

export const getAppInsightsLocations = async (subscriptionId: string): Promise<string[]> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['mcp', 'appInsightsLocations', subscriptionId], async () => {
    try {
      const result: any = await ResourceService().getResource(`/subscriptions/${subscriptionId}/providers/microsoft.insights`, {
        'api-version': '2025-04-01',
      });
      return result.resourceTypes
        ? (result.resourceTypes
            .find((value: any) => value.resourceType === 'components')
            ?.locations.map((location: string) => getLocationNormalized(location)) ?? [])
        : [];
    } catch {
      return [];
    }
  });
};

const getAppInsights = async (subscriptionId: string): Promise<Resource[]> => {
  const query = `resources | where type =~ 'microsoft.insights/components' | project id, name, type, location`;
  const result = await ResourceService().listResources(subscriptionId, query);
  return result.map((item: any) => ({ id: item.id.toLowerCase(), name: item.name, displayName: `${item.name} (${item.location})` }));
};

export const getHostConfig = async (siteResourceId: string): Promise<any> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['hostconfig', siteResourceId], async () => {
    const response = await ResourceService().getResource(`${siteResourceId}/host/default/properties/config`, {
      'api-version': '2021-02-01',
    });
    return response;
  });
};

export const resetQueriesOnRegisterMcpServer = (subscriptionId: string, resourceGroup: string, logicAppName: string) => {
  const queryClient = getReactQueryClient();

  const resourceId = `${getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName)}/workflowsconfiguration/connections`;
  queryClient.invalidateQueries([workflowAppConnectionsKey, resourceId.toLowerCase()]);
  queryClient.invalidateQueries(['mcp', 'logicapps', subscriptionId]);
};

export const resetQueriesOnUpdateServers = (siteResourceId: string) => {
  const queryClient = getReactQueryClient();
  queryClient.invalidateQueries(['mcpservers', siteResourceId.toLowerCase()]);
};

export const resetQueriesOnServerAuthUpdate = (siteResourceId: string) => {
  const queryClient = getReactQueryClient();
  queryClient.invalidateQueries(['hostconfig', siteResourceId.toLowerCase()]);
  queryClient.invalidateQueries(['mcpauth', siteResourceId.toLowerCase()]);
};

export const getLocationNormalized = (location: string): string => location.replace(/ /g, '').toLowerCase();

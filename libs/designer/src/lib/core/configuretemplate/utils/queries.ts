import type { ArmResource, LogicAppResource, WorkflowResource, Template } from '@microsoft/logic-apps-shared';
import { getTriggerFromDefinition, ResourceService, TemplateResourceService } from '@microsoft/logic-apps-shared';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConnector } from '../../queries/operation';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import { getReactQueryClient } from '../../ReactQueryProvider';

export const getTemplateManifest = async (templateId: string): Promise<Template.TemplateManifest> => {
  const templateResource = await getTemplate(templateId);
  return (
    templateResource?.properties?.manifest
      ? { id: templateId, workflows: {}, ...templateResource.properties.manifest }
      : {
          id: templateId,
          title: '',
          summary: '',
          workflows: {},
          skus: [],
          details: {
            By: '',
            Type: '',
            Category: '',
          },
        }
  ) as Template.TemplateManifest;
};

export const getWorkflowsInTemplate = async (templateId: string): Promise<Record<string, Template.WorkflowManifest>> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['templateworkflows', templateId.toLowerCase()], async () => {
    const workflows = await TemplateResourceService().getTemplateWorkflows(templateId);
    return workflows.reduce((result: Record<string, Template.WorkflowManifest>, workflow) => {
      const workflowId = workflow.properties.manifest.id;
      result[workflowId] = workflow.properties.manifest
        ? workflow.properties.manifest
        : {
            id: workflowId,
            title: '',
            summary: '',
            images: { light: '', dark: '' },
            parameters: [],
            connections: {},
          };
      return result;
    }, {});
  });
};

export const getWorkflowResourcesInTemplate = async (templateId: string): Promise<ArmResource<any>[]> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['templateworkflowresources', templateId.toLowerCase()], async () => {
    const workflows = await TemplateResourceService().getTemplateWorkflows(templateId, /* rawData */ true);
    return workflows;
  });
};

export const useTemplate = (templateId: string, enabled = true): UseQueryResult<ArmResource<any>, unknown> => {
  return useQuery(['template', templateId?.toLowerCase()], async () => TemplateResourceService().getTemplate(templateId), {
    cacheTime: 1000 * 60 * 60 * 24,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: enabled && !!templateId,
  });
};

export const useTemplateWorkflowResources = (templateId: string, enabled = true): UseQueryResult<ArmResource<any>[], unknown> => {
  return useQuery(
    ['templateworkflowresources', templateId?.toLowerCase()],
    async () => TemplateResourceService().getTemplateWorkflows(templateId, /* rawData */ true),
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: enabled && !!templateId,
    }
  );
};

export const getTemplate = async (templateId: string): Promise<ArmResource<any>> => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['template', templateId.toLowerCase()], async () => TemplateResourceService().getTemplate(templateId));
};

export const useAllConnectors = (operationInfos: Record<string, NodeOperation>) => {
  const allConnectorIds = Object.values(operationInfos).reduce((result: string[], operationInfo) => {
    const normalizedConnectorId = operationInfo.connectorId?.toLowerCase();
    if (normalizedConnectorId && !result.includes(normalizedConnectorId)) {
      result.push(normalizedConnectorId);
    }

    return result;
  }, []);

  return useQuery(['allconnectors', ...allConnectorIds], async () => {
    const promises = allConnectorIds.map((connectorId) => getConnector(connectorId));
    return (await Promise.all(promises))
      .filter((connector) => !!connector)
      .map((connector) => ({
        id: connector.id.toLowerCase(),
        displayName: connector.properties.displayName ?? connector.name,
      }));
  });
};

export const useAllLogicApps = (
  subscriptionId: string,
  resourceGroup: string,
  enabled: boolean
): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['allLogicApps', subscriptionId?.toLowerCase(), resourceGroup?.toLowerCase()],
    async () => {
      return ResourceService().listAllLogicApps(subscriptionId, resourceGroup);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: enabled && !!subscriptionId && !!resourceGroup,
    }
  );
};

export const useWorkflowsInApp = (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  isConsumption: boolean
): UseQueryResult<WorkflowResource[], unknown> => {
  const queryClient = useQueryClient();
  return useQuery(
    ['workflowsInApp', subscriptionId?.toLowerCase(), resourceGroup?.toLowerCase(), logicAppName?.toLowerCase(), isConsumption],
    async () => {
      if (isConsumption) {
        const workflow = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
        return [{ id: workflow.id, name: workflow.name, triggerType: getTriggerFromDefinition(workflow.properties.definition.triggers) }];
      }

      return ResourceService().listWorkflowsInApp(subscriptionId, resourceGroup, logicAppName, isConsumption);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!subscriptionId && !!resourceGroup && !!logicAppName,
    }
  );
};

export const getConsumptionWorkflow = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  queryClient: QueryClient
): Promise<ArmResource<any>> => {
  const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Logic/workflows/${logicAppName}`;
  const queryParameters = {
    'api-version': '2019-05-01',
    $expand: 'connections.json,parameters.json',
  };
  return queryClient.fetchQuery(['workflow', resourceId.toLowerCase()], async () =>
    ResourceService().getResource(resourceId, queryParameters)
  );
};

export const getStandardWorkflow = async (workflowId: string, queryClient: QueryClient): Promise<ArmResource<any>> => {
  const queryParameters = {
    'api-version': '2018-11-01',
  };
  return queryClient.fetchQuery(['workflow', workflowId.toLowerCase()], async () =>
    ResourceService().getResource(workflowId, queryParameters)
  );
};

export const getConnectionsInWorkflowApp = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  queryClient: QueryClient
): Promise<Record<string, any>> => {
  const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}/workflowsconfiguration/connections`;
  const queryParameters = {
    'api-version': '2018-11-01',
  };
  return queryClient.fetchQuery(['connectionsdata', resourceId.toLowerCase()], async () => {
    try {
      const response = await ResourceService().getResource(resourceId, queryParameters);
      return response.properties.files?.['connections.json'];
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return {};
      }
      throw error;
    }
  });
};

export const getParametersInWorkflowApp = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  queryClient: QueryClient
): Promise<Record<string, any>> => {
  const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}/hostruntime/admin/vfs/parameters.json`;
  const queryParameters = {
    'api-version': '2018-11-01',
    relativepath: '1',
  };
  return queryClient.fetchQuery(['parametersdata', resourceId.toLowerCase()], async () => {
    try {
      const parameters: Record<string, any> = await ResourceService().getResource(resourceId, queryParameters);
      return Object.keys(parameters ?? {}).reduce((result: Record<string, any>, parameterKey: string) => {
        result[parameterKey] = { ...parameters[parameterKey] };
        delete result[parameterKey].value;
        return result;
      }, {});
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return {};
      }
      throw error;
    }
  });
};

export const resetTemplateWorkflowsQuery = (templateId: string, clearRawData = false) => {
  const queryClient = getReactQueryClient();
  queryClient.removeQueries(['templateworkflows', templateId.toLowerCase()]);

  if (clearRawData) {
    queryClient.removeQueries(['templateworkflowresources', templateId.toLowerCase()]);
  }
};

export const resetAllTemplatesQuery = (templateId: string, clearRawData = false) => {
  const queryClient = getReactQueryClient();
  queryClient.removeQueries(['template', templateId.toLowerCase()]);
  resetTemplateWorkflowsQuery(templateId, clearRawData);
};

export const resetTemplateQuery = (templateId: string) => {
  const queryClient = getReactQueryClient();
  queryClient.removeQueries(['template', templateId.toLowerCase()]);
};

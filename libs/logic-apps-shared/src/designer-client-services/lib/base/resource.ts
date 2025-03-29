import { getTriggerFromDefinition, type ArmResource } from '../../../utils/src';
import { fetchAppsByQuery, getAzureResourceRecursive } from '../common/azure';
import type { IHttpClient } from '../httpClient';
import type { Resource, IResourceService, LogicAppResource, WorkflowResource } from '../resource';

export interface BaseResourceServiceOptions {
  httpClient: IHttpClient;
  baseUrl: string;
  apiVersion: string;
}

export class BaseResourceService implements IResourceService {
  constructor(private options: BaseResourceServiceOptions) {}

  async listSubscriptions(): Promise<Resource[]> {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}/subscriptions`;
      const queryParameters = { 'api-version': apiVersion };
      const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
      return response.map((item) => ({ id: item.id, name: getNameFromId(item.id), displayName: item.displayName }));
    } catch (error) {
      throw new Error(error as any);
    }
  }

  async listResourceGroups(subscriptionId: string | undefined): Promise<Resource[]> {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}/subscriptions/${subscriptionId}/resourcegroups`;
      const queryParameters = { 'api-version': apiVersion };
      const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
      return response.map((item) => ({ id: item.id, name: item.name, displayName: item.name }));
    } catch (error) {
      throw new Error(error as any);
    }
  }

  async listLocations(subscriptionId: string | undefined): Promise<Resource[]> {
    try {
      const { baseUrl, httpClient } = this.options;
      const uri = `${baseUrl}/subscriptions/${subscriptionId}/locations`;
      const queryParameters = { 'api-version': '2019-11-01' };
      const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
      return response.map((item) => ({ id: item.id, name: item.name, displayName: item.displayName }));
    } catch (error) {
      throw new Error(error as any);
    }
  }

  async listLogicApps(subscriptionId: string, resourceGroup: string): Promise<LogicAppResource[]> {
    const { baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`;
    const query = `resources | where type == "microsoft.web/sites" and kind contains "workflowapp" and resourceGroup =~ "${resourceGroup.toLowerCase()}"`;
    const response = await fetchAppsByQuery(httpClient, uri, [subscriptionId], query);
    return response.map((item) => ({ id: item.id, name: item.name, location: item.location, plan: 'Standard' }));
  }

  async listAllLogicApps(subscriptionId: string, resourceGroup: string): Promise<LogicAppResource[]> {
    const { baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`;
    const query = `resources | where type =~ 'microsoft.logic/workflows' or (type =~ 'microsoft.web/sites' and kind contains 'workflowapp') | where resourceGroup =~ '${resourceGroup.toLowerCase()}' | extend plan = case(kind contains 'workflowapp', 'Standard', 'Consumption')`;
    const response = await fetchAppsByQuery(httpClient, uri, [subscriptionId], query);
    return response.map((item) => ({ id: item.id, name: item.name, location: item.location, plan: item.plan }));
  }

  async listWorkflowsInApp(subscriptionId: string, resourceGroup: string, logicAppName: string): Promise<WorkflowResource[]> {
    const { baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}/hostruntime/runtime/webhooks/workflow/api/management/workflows`;
    const queryParameters = { 'api-version': '2018-11-01' };
    const response: any = await httpClient.get({ uri, queryParameters });
    return response.map((item: any) => ({
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}/workflows/${item.name}`,
      name: getNameFromId(item.name),
      triggerType: getTriggerFromDefinition(item.triggers),
    }));
  }

  async getResource(resourceId: string, queryParameters: Record<string, string>): Promise<ArmResource<any>> {
    const { baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}${resourceId}`;
    return httpClient.get({ uri, queryParameters });
  }
}

const getNameFromId = (id: string): string => {
  return id.split('/').pop() ?? id;
};

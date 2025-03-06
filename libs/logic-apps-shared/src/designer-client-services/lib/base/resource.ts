import { fetchAppsByQuery, getAzureResourceRecursive } from '../common/azure';
import type { IHttpClient } from '../httpClient';
import type { Resource, LogicAppResource, IResourceService } from '../resource';

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

  async listLogicApps(subscriptionId: string, resourceGroup: string, location: string): Promise<LogicAppResource[]> {
    const { baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`;
    const query = `resources | where type == "microsoft.web/sites" and kind contains "workflowapp" and resourceGroup == "${resourceGroup.toLowerCase()}" and location == "${location.toLowerCase()}"`;
    const response = await fetchAppsByQuery(httpClient, uri, [subscriptionId], query);
    return response.map((item) => ({ id: item.id, name: item.name, kind: 'standard' }));
  }
}

const getNameFromId = (id: string): string => {
  return id.split('/').pop() ?? id;
};

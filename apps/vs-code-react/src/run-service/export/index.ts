import { ResourceType } from '../types';
import type { IApiService, Workflows, WorkflowsList, IExportData } from '../types';
import { getValidationPayload, getExportUri, getWorkflowsUri } from './helper';

export interface ApiServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

const graphApiUri = 'https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01';

export class ApiService implements IApiService {
  private options: ApiServiceOptions;

  constructor(options: ApiServiceOptions) {
    this.options = options;
  }

  private getAccessTokenHeaders = () => {
    const { accessToken } = this.options;
    if (!accessToken) {
      return undefined;
    }

    return new Headers({
      Authorization: accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  };

  private getResourceOptions = (resourceType: string, properties?: any) => {
    switch (resourceType) {
      case ResourceType.subscriptions: {
        return {
          query:
            'resourcecontainers\n | where type == "microsoft.resources/subscriptions"\n| join kind=leftouter (securityresources \n | where properties.environment == "Azure" and properties.displayName == "ASC score"\n ) on subscriptionId\n | extend subscriptionName=name\n | project id, subscriptionId, subscriptionName|sort by (tolower(tostring(subscriptionName))) asc',
        };
      }
      case ResourceType.ise: {
        const selectedSubscription = properties.selectedSubscription;
        return {
          query:
            "resources|where type =~ 'Microsoft.Logic/integrationServiceEnvironments'\r\n | extend iseName=name | project id, iseName, location, subscriptionId, resourceGroup\r\n|sort by (tolower(tostring(iseName))) asc",
          subscriptions: [selectedSubscription],
        };
      }
      default: {
        return {};
      }
    }
  };

  private getWorkflowsUri = (subscriptionId: string, iseId: string) => {
    return `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Logic/workflows?api-version=2018-07-01-preview&$filter=properties/integrationServiceEnvironmentResourceId  eq '${iseId}'`;
  };

  private getPayload = (resourceType: string, properties?: any) => {
    const skipToken = properties?.skipToken;

    let options = {};
    if (skipToken) {
      options = {
        $skipToken: skipToken,
      };
    } else {
      options = {
        $top: 100,
        $skip: 0,
      };
    }

    const resourceOptions = this.getResourceOptions(resourceType, properties);

    return {
      ...resourceOptions,
      options,
    };
  };

  async getWorkflows(subscriptionId: string, iseId: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const workflowsUri = getWorkflowsUri(subscriptionId, iseId);
    const response = await fetch(workflowsUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const workflowsResponse: Workflows = await response.json();
    const { value: workflows } = workflowsResponse;

    return { workflows };
  }

  async getSubscriptions(): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const payload = this.getPayload(ResourceType.subscriptions);
    const response = await fetch(graphApiUri, { headers, method: 'POST', body: JSON.stringify(payload) });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const subscriptionsResponse: any = await response.json();
    const { data: subscriptions } = subscriptionsResponse;

    return { subscriptions };
  }

  async getIse(selectedSubscription: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const payload = this.getPayload(ResourceType.ise, { selectedSubscription: selectedSubscription });
    const response = await fetch(graphApiUri, { headers, method: 'POST', body: JSON.stringify(payload) });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const iseResponse: any = await response.json();
    const { data: ise } = iseResponse;

    return { ise };
  }

  async validateWorkflows(selectedWorkflows: Array<WorkflowsList>, selectedSubscription: string, selectedLocation: string) {
    const headers = this.getAccessTokenHeaders();
    const validationUri = getExportUri(selectedSubscription, selectedLocation, true);
    const validationPayload = getValidationPayload(selectedWorkflows);
    const response = await fetch(validationUri, { headers, method: 'POST', body: JSON.stringify(validationPayload) });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const validationResponse: any = await response.json();
    return validationResponse;
  }

  async exportWorkflows(selectedWorkflows: Array<WorkflowsList>, selectedSubscription: string, selectedLocation: string) {
    const headers = this.getAccessTokenHeaders();
    const exportUri = getExportUri(selectedSubscription, selectedLocation, false);
    const exportPayload = getValidationPayload(selectedWorkflows);
    const response = await fetch(exportUri, { headers, method: 'POST', body: JSON.stringify(exportPayload) });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const exportResponse: IExportData = await response.json();
    return exportResponse;
  }
}

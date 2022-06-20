import type { ArmResources, IApiService, Workflows } from '../types';

export interface ApiServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

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

  private getPayload = (skipToken?: string) => {
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

    return {
      query:
        "resources|where type =~ 'microsoft.logic/workflows' or (type =~ 'microsoft.web/sites' and kind contains 'workflowapp')\r\n| project name,resourceGroup,id,type,location,subscriptionId|sort by (tolower(tostring(name))) asc",
      subscriptions: [],
      options,
    };
  };

  async getMoreWorkflows(continuationToken: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const response = await fetch(continuationToken, { headers, method: 'POST' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const { nextLink, value: runs }: ArmResources<any> = await response.json();
    return { nextLink, runs };
  }

  async getWorkflows(): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const payload = this.getPayload();
    const uri = 'https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01';

    const response = await fetch(uri, { headers, method: 'POST', body: JSON.stringify(payload) });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const workflowsResponse: Workflows = await response.json();
    const { $skipToken: nextLink, data: workflows } = workflowsResponse;

    return { nextLink, workflows };
  }
}

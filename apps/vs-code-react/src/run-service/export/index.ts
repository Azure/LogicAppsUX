import type { ArmResources, IApiService, Subscription } from '../types';

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
    });
  };

  async getSubscriptions(): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    console.log('accessToken4', headers);

    //const uri = `${baseUrl}/subscriptions?api-version=${apiVersion}`;
    const uri = 'https://management.azure.com/subscriptions?api-version=2020-01-01';
    const response = await fetch(uri, { headers, method: 'GET' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const parsedResponse: ArmResources<Subscription> = await response.json();
    const { nextLink, value: subscriptions } = parsedResponse;
    return { nextLink, subscriptions };
  }
}

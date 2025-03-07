import type { IHttpClient } from '../httpClient';

export interface ContinuationTokenResponse<T> {
  value: T;
  nextLink: string;
}

export const getAzureResourceRecursive = async (httpClient: IHttpClient, uri: string, queryParams: any): Promise<any[]> => {
  const requestPage = async (uri: string, value: any[], queryParameters?: any): Promise<any> => {
    try {
      const { nextLink, value: newValue } = await httpClient.get<ContinuationTokenResponse<any[]>>({
        uri,
        queryParameters,
        includeAuth: true,
      });
      value.push(...newValue);
      if (nextLink) {
        return await requestPage(nextLink, value);
      }
      return value;
    } catch (_error) {
      return value;
    }
  };

  return requestPage(uri, [], queryParams);
};

export interface Tenant {
  id: string;
  tenantId: string;
  country: string;
  countryCode: string;
  displayName?: string;
  domains: string[];
}

export const fetchAppsByQuery = async (httpClient: IHttpClient, uri: string, subscriptionIds: string[], query: string): Promise<any[]> => {
  const requestPage = async (value: any[] = [], pageNum = 0, currentSkipToken = ''): Promise<any> => {
    try {
      const pageSize = 500;
      const result: any = await httpClient.post({
        uri,
        content: {
          query,
          options: {
            resultFormat: 'ObjectArray',
            $top: pageSize,
            $skip: pageSize * pageNum,
            $skipToken: currentSkipToken,
          },
          subscriptions: subscriptionIds,
        },
      });

      const $skipToken = result.$skipToken;
      const newValues = result.data;
      value.push(...newValues);
      if ($skipToken && newValues.length !== 0) {
        return await requestPage(value, pageNum + 1, $skipToken);
      }
      return value;
    } catch (_e) {
      return value;
    }
  };
  return requestPage();
};

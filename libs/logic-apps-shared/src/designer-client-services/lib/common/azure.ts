import type { IHttpClient } from '../httpClient';

export interface ContinuationTokenResponse<T> {
  value: T;
  nextLink: string;
}

export const getAzureResourceRecursive = async (httpClient: IHttpClient, uri: string, queryParams: any): Promise<any[]> => {
  const requestPage = async (uri: string, value: any[], queryParameters?: any): Promise<any> => {
    try {
      const { nextLink, value: newValue } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri, queryParameters });
      value.push(...newValue);
      if (nextLink) return await requestPage(nextLink, value);
      return value;
    } catch (error) {
      return value;
    }
  };

  return requestPage(uri, [], queryParams);
};

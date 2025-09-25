import type { HttpRequestOptions, IHttpClient } from '@microsoft/logic-apps-shared';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import axios from 'axios';

export interface HttpOptions {
  baseUrl?: string;
  apiHubBaseUrl?: string;
  accessToken?: string;
  hostVersion?: string;
}

export class HttpClient implements IHttpClient {
  private _baseUrl: string | undefined;
  private _accessToken: string | undefined;
  private _apihubBaseUrl: string | undefined;
  private _extraHeaders: Record<string, string>;

  constructor(options: HttpOptions) {
    this._baseUrl = options.baseUrl;
    this._accessToken = options.accessToken;
    this._apihubBaseUrl = options.apiHubBaseUrl;
    this._extraHeaders = getExtraHeaders(options.hostVersion ?? '');
  }

  dispose(): void {}

  async get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    const isArmId = isArmResourceId(options.uri);
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        Authorization: `${isArmId ? this._accessToken : ''}`,
      },
    };
    const response = await axios({
      method: HTTP_METHODS.GET,
      ...request,
    });

    if (options.returnHeaders) {
      return {
        responseHeaders: response.headers,
        ...response.data,
      };
    }

    return response.data;
  }

  async patch<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const isArmId = isArmResourceId(options.uri);
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        Authorization: `${isArmId ? this._accessToken : ''}`,
        'Content-Type': 'application/json',
      },
      data: options.content,
      commandName: 'Designer.httpClient.patch',
    };
    const response = await axios({
      method: HTTP_METHODS.PATCH,
      ...request,
    });

    if (!isSuccessResponse(response.status)) {
      return Promise.reject(response);
    }

    return parseResponse(response, options);
  }

  async post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const authHeader: Record<string, string> = options.includeAuth || !options.noAuth ? { Authorization: `${this._accessToken}` } : {};
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        ...authHeader,
        'Content-Type': 'application/json',
      },
      data: options.content,
      commandName: 'Designer.httpClient.post',
    };

    try {
      const response = await axios({
        method: HTTP_METHODS.POST,
        ...request,
      });

      if (!isSuccessResponse(response.status)) {
        throw response;
      }

      return parseResponse(response, options);
    } catch (error: any) {
      throw error?.response?.data ?? error?.response ?? error;
    }
  }

  async put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const isArmId = isArmResourceId(options.uri);
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        Authorization: `${isArmId ? this._accessToken : ''}`,
        'Content-Type': 'application/json',
      },
      data: options.content,
      commandName: 'Designer.httpClient.put',
    };
    const response = await axios({
      ...request,
      method: HTTP_METHODS.PUT,
    }).catch((error) => {
      return {
        status: error.response.status,
        responseHeaders: options.returnHeaders ? error.response.headers : undefined,
        ...error.response.data,
      };
    });
    if (!isSuccessResponse(response.status)) {
      return Promise.reject(response);
    }

    return parseResponse(response, options);
  }

  async delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    const request = {
      ...options,
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        Authorization: `${this._accessToken}`,
      },
    };
    const response = await axios({
      method: HTTP_METHODS.DELETE,
      ...request,
    });

    if (options.returnHeaders) {
      return {
        responseHeaders: response.headers,
        ...response.data,
      };
    }

    return response.data;
  }

  private getRequestUrl(options: HttpRequestOptions<unknown>): string {
    const { uri, queryParameters } = options;
    let queryString = '';

    if (queryParameters) {
      for (const queryKey of Object.keys(queryParameters)) {
        queryString += `${encodeURIComponent(queryKey)}=${encodeURIComponent(queryParameters[queryKey])}&`;
      }
      queryString = queryString.substring(0, queryString.length - 1);
    }
    const updatedUri = queryString ? `${uri}?${queryString}` : uri;
    return isUrl(updatedUri)
      ? updatedUri
      : isArmResourceId(updatedUri)
        ? `${this._apihubBaseUrl}${updatedUri}`
        : `${this._baseUrl}${updatedUri}`;
  }
}

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.indexOf('/subscriptions/') !== -1 : false;
}

function getExtraHeaders(hostVersion: string): Record<string, string> {
  return {
    'x-ms-user-agent': `LogicAppsDesigner/(host vscode ${hostVersion})`,
  };
}

function isUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isSuccessResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode <= 299;
}

function parseResponse(response: any, options: HttpRequestOptions<any>) {
  let responseData: any;
  try {
    responseData = typeof response?.data === 'string' ? JSON.parse(response?.data) : response?.data;
  } catch {
    responseData = { data: response?.data as any };
  }

  if (options?.returnHeaders) {
    return {
      responseHeaders: response?.headers,
      ...responseData,
    };
  }

  return responseData;
}

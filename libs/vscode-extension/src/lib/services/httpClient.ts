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
    const responseData = await axios({
      method: HTTP_METHODS.GET,
      ...request,
    });

    return responseData?.data;
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
    const responseData = await axios({
      method: HTTP_METHODS.PATCH,
      ...request,
    });

    if (!isSuccessResponse(responseData.status)) {
      return Promise.reject(responseData);
    }

    try {
      return JSON.parse(responseData.data);
    } catch {
      return responseData.data as any;
    }
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

      try {
        return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } catch {
        return response.data as any;
      }
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
    const responseData = await axios({
      ...request,
      method: HTTP_METHODS.PUT,
    }).catch((error) => {
      return { status: error.response.status, ...error.response.data };
    });
    if (!isSuccessResponse(responseData.status)) {
      return Promise.reject(responseData);
    }

    try {
      return JSON.parse(responseData.data);
    } catch {
      return responseData.data as any;
    }
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
    const responseData = await axios({
      method: HTTP_METHODS.DELETE,
      ...request,
    });
    return responseData.data;
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

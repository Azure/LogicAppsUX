import { environment } from '../../../environments/environment';
import type { HttpRequestOptions, IHttpClient } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import axiosRetry from 'axios-retry';

export class HttpClient implements IHttpClient {
  private _extraHeaders: Record<string, any>;

  constructor() {
    this._extraHeaders = getExtraHeaders();
    axiosRetry(axios, { retries: 3 });
  }

  async get<ReturnType>(options: HttpRequestOptions<any>): Promise<ReturnType> {
    const isArmId = isArmResourceId(options.uri);
    const requestUrl = getRequestUrl(options);
    const auth = isArmId
      ? {
          Authorization: `Bearer ${environment.armToken}`,
        }
      : {};

    const response = await axios.get(requestUrl, {
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        ...auth,
      },
    });
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const response = await axios.post(getRequestUrl(options), options.content, {
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.armToken}`,
      },
    });

    if (!isSuccessResponse(response.status)) {
      return Promise.reject(response);
    }

    try {
      return response.data;
    } catch {
      return response as any;
    }
  }

  async put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const response = await axios.put(getRequestUrl(options), options.content, {
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    if (!isSuccessResponse(response.status)) {
      return Promise.reject(response);
    }

    try {
      return response.data;
    } catch {
      return response as any;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    const response = await axios.delete(getRequestUrl(options), {
      headers: {
        ...this._extraHeaders,
        ...options.headers,
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  dispose(): void {}
}
export function getRequestUrl(options: HttpRequestOptions<unknown>): string {
  const { uri, queryParameters } = options;
  let queryString = '';

  if (queryParameters) {
    for (const queryKey of Object.keys(queryParameters)) {
      queryString += `${encodeURIComponent(queryKey)}=${encodeURIComponent(queryParameters[queryKey])}&`;
    }
    queryString = queryString.substring(0, queryString.length - 1);
  }

  const uriPath = queryString ? `${uri}?${queryString}` : uri;
  if (uriPath.startsWith('/subscriptions/')) {
    return `https://management.azure.com${uriPath}`;
  } else {
    return uriPath;
  }
}

export function isSuccessResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode <= 299;
}

export function getExtraHeaders(): Record<string, string> {
  return {
    'x-ms-user-agent': `LogicAppsDesigner/(host localdesigner)`,
  };
}

function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.indexOf('/subscriptions/') !== -1 : false;
}

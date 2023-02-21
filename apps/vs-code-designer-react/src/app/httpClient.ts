/* eslint-disable @typescript-eslint/no-empty-function */
import type { HttpRequestOptions, IHttpClient } from '@microsoft/designer-client-services-logic-apps';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import axios from 'axios';

export interface HttpOptions {
  baseUrl?: string;
  accessToken?: string;
}

export class HttpClient implements IHttpClient {
  private _baseUrl: string | undefined;
  private _accessToken: string | undefined;
  constructor(options: HttpOptions) {
    this._baseUrl = options.baseUrl;
    this._accessToken = options.accessToken;
  }

  dispose(): void {}

  async get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    if (isLocalUrl(getRequestUrl(options))) {
      //local get request
      return {} as ReturnType;
    } else {
      const responseData = await axios({
        method: HTTP_METHODS.GET,
        url: `${this._baseUrl + getRequestUrl(options)}`,
        headers: {
          Authorization: `${this._accessToken}`,
          ...options.headers,
        },
        ...options,
      });
      return responseData.data;
    }
  }
  async post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    if (isLocalUrl(getRequestUrl(options))) {
      //local post request
      return {} as ReturnType;
    } else {
      const responseData = await axios({
        method: HTTP_METHODS.POST,
        url: `${this._baseUrl + getRequestUrl(options)}`,
        headers: {
          Authorization: `${this._accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.content,
        ...options,
      });
      if (!isSuccessResponse(responseData.status)) {
        return Promise.reject(responseData);
      }
      try {
        return JSON.parse(responseData.data);
      } catch {
        return responseData as any;
      }
    }
  }
  async put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    if (isLocalUrl(getRequestUrl(options))) {
      //local post request
      return {} as ReturnType;
    } else {
      const responseData = await axios({
        method: HTTP_METHODS.PUT,
        url: `${this._baseUrl + getRequestUrl(options)}`,
        headers: {
          Authorization: `${this._accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.content,
        ...options,
      });
      if (!isSuccessResponse(responseData.status)) {
        return Promise.reject(responseData);
      }
      try {
        return JSON.parse(responseData.data);
      } catch {
        return responseData as any;
      }
    }
  }
  async delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    if (isLocalUrl(getRequestUrl(options))) {
      //local delete request
      return {} as ReturnType;
    } else {
      const responseData = await axios({
        method: HTTP_METHODS.DELETE,
        url: `${this._baseUrl + getRequestUrl(options)}`,
        ...options,
      });
      return responseData.data;
    }
  }
}

function getRequestUrl(options: HttpRequestOptions<unknown>): string {
  const { uri, queryParameters } = options;
  let queryString = '';

  if (queryParameters) {
    for (const queryKey of Object.keys(queryParameters)) {
      queryString += `${encodeURIComponent(queryKey)}=${encodeURIComponent(queryParameters[queryKey])}&`;
    }
    queryString = queryString.substring(0, queryString.length - 1);
  }

  return queryString ? `${uri}?${queryString}` : uri;
}

function isLocalUrl(url: string): boolean {
  return url.startsWith('http://localhost') || url.startsWith('https://localhost');
}

function isSuccessResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode <= 299;
}

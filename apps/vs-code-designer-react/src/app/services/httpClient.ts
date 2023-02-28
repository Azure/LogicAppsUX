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
    const isArmId = isArmResourceId(options.uri);
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...options.headers,
        Authorization: `${isArmId ? this._accessToken : ''}`,
      },
    };
    const responseData = await axios({
      method: HTTP_METHODS.GET,
      ...request,
    });
    if (!isSuccessResponse(responseData.status)) {
      console.log('invalid get request', request);
    }
    return responseData?.data;
  }

  async post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const isArmId = isArmResourceId(options.uri);
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...options.headers,
        Authorization: `${isArmId ? this._accessToken : ''} `,
        'Content-Type': 'application/json',
      },
      data: options.content,
      commandName: 'Designer.httpClient.post',
    };
    console.log('post request', request);
    const responseData = await axios({
      method: HTTP_METHODS.POST,
      ...request,
    });
    if (!isSuccessResponse(responseData.status)) {
      console.log('invalid put request', responseData);
      return Promise.reject(responseData);
    }

    try {
      return JSON.parse(responseData.data);
    } catch {
      return responseData.data as any;
    }
  }
  async put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    const isArmId = isArmResourceId(options.uri);
    const request = {
      ...options,
      url: this.getRequestUrl(options),
      headers: {
        ...options.headers,
        Authorization: `${isArmId ? this._accessToken : ''} `,
        'Content-Type': 'application/json',
      },
      data: options.content,
      commandName: 'Designer.httpClient.put',
    };
    console.log('put request', request);
    const responseData = await axios({
      ...request,
      method: HTTP_METHODS.PUT,
    }).catch((error) => {
      console.log('put error', error);
      return { status: error.response.status, data: error.response.data };
    });
    if (!isSuccessResponse(responseData.status)) {
      console.log('invalid put request', responseData);
      return Promise.reject(responseData);
    }

    console.log('responseData', responseData);
    try {
      console.log('parsedResponseData', JSON.parse(responseData.data));
      return JSON.parse(responseData.data);
    } catch {
      return responseData.data as any;
    }
  }
  async delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    const request = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `${this._accessToken} `,
      },
    };
    console.log('delete request', request);
    const responseData = await axios({
      method: HTTP_METHODS.DELETE,
      ...request,
    });
    console.log(responseData);
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
    const updatedUri = isUri(uri) ? uri : `${this._baseUrl}${uri}`;
    return queryString ? `${updatedUri}?${queryString}` : updatedUri;
  }
}

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.indexOf('/subscriptions/') !== -1 : false;
}

function isUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

function isSuccessResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode <= 299;
}

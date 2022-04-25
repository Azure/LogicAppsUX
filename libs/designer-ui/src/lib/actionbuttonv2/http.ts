/* eslint-disable no-useless-catch */

/* tslint:disable: no-any */
import { AccessTokenHelper } from './accessTokenHelper';
import { Guid } from 'guid-typescript';

// import { Analytics, ResponseData } from '../analytics/analytics';

export type BeforeRequestHandler = (request: HttpRequest<any>) => Promise<HttpRequest<any>>;
export type RequestHeaders = Headers | Record<string, string>;

export interface HttpRequest<T> {
  body?: T;
  headers?: RequestHeaders;
  path?: string;
  query?: Record<string, any>;
  dontAddAccessToken?: boolean;
  url?: string;

  json?: boolean;
  shouldIncludeClientRequestId?: boolean;
}

export interface HttpResponse<T> {
  body: T;
  headers: Headers;
  ok: boolean;
  status: number;
  url: string;
}

interface ParsedRequest {
  url: string;
  init: RequestInit;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: any): void;
}

const HTTP_DELETE = 'DELETE';
const HTTP_GET = 'GET';
const HTTP_PATCH = 'PATCH';
const HTTP_POST = 'POST';
const HTTP_PUT = 'PUT';

const ACCEPT_HEADER = 'Accept';
const CONTENT_TYPE = 'Content-Type';
const CONTENT_LENGTH = 'Content-Length';
const ACCEPT_LANGUAGE = 'Accept-Language';

const MIME_APPLICATION_JSON = 'application/json';

const X_MS_CLIENT_REQUEST_ID = 'x-ms-client-request-id';
const X_MS_REQUEST_ID = 'x-ms-request-id';

const MSLA_REQUEST = 'MSLA.REQUEST';
const MSLA_REQUEST_ACCESS_TOKEN = 'MSLA.REQUEST.ACCESSTOKEN';

// TODO: Implement adding header operation in all the services then remove this funcationality from http client;
let HttpExtraHeaders: Record<string, string>;

export interface HttpOptions {
  //analytics: Analytics;
  baseUrl?: string;
  getAccessToken?(): Promise<string>;
  locale?: string;
}

export function odataEscape(stringToEscape: string): string {
  if (stringToEscape) {
    return stringToEscape.replace(/'/g, `''`);
  } else {
    return stringToEscape;
  }
}

export function getClientRequestIdFromHeaders(headers: Headers | Record<string, string>): string {
  if (headers) {
    return headers instanceof Headers ? headers.get(X_MS_CLIENT_REQUEST_ID)! : headers[X_MS_CLIENT_REQUEST_ID];
  }

  return '';
}

export function addHeaderIfNotExists<TRequestBody>(request: HttpRequest<TRequestBody>, key: string, value: string) {
  const headers: RequestHeaders = request.headers || new Headers();
  key = key.toLowerCase();

  if (headers instanceof Headers) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  } else {
    if (!Object.prototype.hasOwnProperty.call(headers as Record<string, string>, key)) {
      (headers as Record<string, string>)[key] = value;
    }
  }

  request.headers = headers;
}

export function loadHttpExtraHeaders(headers: Record<string, string>) {
  HttpExtraHeaders = headers;
}

type QueryRecord = Record<string, any>;

/*
usage:

    import { HttpClient, HttpRequest, HttpResponse, odataEscape, addHeaderIfNotExists, addQueryIfNotExists } from 'libs/http/http';

    var client = new HttpClient('http://management.azure.com');

    client.setBeforeRequestHandler(request => {
        addHeaderIfNotExists(request, 'authorization', `Bearer ${getAccessToken()}`);
        addQueryIfNotExists(request, 'api-version', '2015-08-27');

        if (!request.hasOwnProperty('json')) {
            request.json = true;
        }

        return Promise.resolve(request);
    });

    client.get(<HttpRequest<any>>{
        path: '/providers/Microsoft.PowerApps/connectionProviders/connectionOperations',
        query: {
            $filter: `asyncPattern eq 'TriggerAfterAccepted' and contains(properties/description, '${odataEscape("search'text with ''quotes")}')`
        }
    }).then(response => {
        if (response.ok) { // response.status >= 200 && response.status < 300
            let body = response.body;
        } else {
            // error
        }
    }).catch(err => {
        // network or json parse error
        // this will not be called for auth failures
    });
 */
export class HttpClient {
  private _accessTokenHelper: AccessTokenHelper | undefined;
  // private _analytics: Analytics;
  private _baseUrl: string | undefined;
  private _beforeRequestHandler: BeforeRequestHandler;
  private _locale: string | undefined;

  public static createInstance(options: HttpOptions): HttpClient {
    return new HttpClient(options);
  }

  private static _defaultRequestHandler(request: HttpRequest<any>): Promise<HttpRequest<any>> {
    return Promise.resolve(request);
  }

  constructor(options: HttpOptions) {
    // if (!options.analytics) {
    //     throw new Error('analytics service required');
    // }

    //this._analytics = options.analytics;
    this._baseUrl = options.baseUrl;
    this._beforeRequestHandler = HttpClient._defaultRequestHandler;

    if (options.getAccessToken) {
      this._accessTokenHelper = new AccessTokenHelper(options.getAccessToken);
      this.setBeforeRequestHandler(async (request) => {
        if (!request.dontAddAccessToken) {
          // eslint-disable-next-line no-useless-catch
          try {
            const accessToken = await this._accessTokenHelper!.getAccessToken();
            addHeaderIfNotExists(request, 'authorization', accessToken);
          } catch (exception) {
            //this._analytics.logError(MSLA_REQUEST_ACCESS_TOKEN, exception);
            throw exception;
          }
        }
        return request;
      });
    }

    this._locale = options.locale;
  }

  setBeforeRequestHandler(beforeRequestHandler: BeforeRequestHandler) {
    this._beforeRequestHandler = beforeRequestHandler || HttpClient._defaultRequestHandler;
  }

  pathCombine(url: string, path: string): string {
    let pathUrl: string;

    if (!url || !path) {
      pathUrl = url || path;
      return pathUrl;
    }

    url = this._trimUrl(url);
    path = this._trimUrl(path);

    pathUrl = `${url}/${path}`;

    return pathUrl;
  }

  execute<TRequestBody, TResponseBody>(
    httpMethod: string,
    request: HttpRequest<TRequestBody>
  ): Promise<HttpResponse<TResponseBody> | null> {
    return this._do(httpMethod, request);
  }

  delete<TResponseBody>(request: HttpRequest<any>): Promise<HttpResponse<TResponseBody> | null> {
    return this._do(HTTP_DELETE, request);
  }

  get<TResponseBody>(request: HttpRequest<any>): Promise<HttpResponse<TResponseBody>> {
    return this._do(HTTP_GET, request);
  }

  patch<TRequestBody, TResponseBody>(request: HttpRequest<TRequestBody>): Promise<HttpResponse<TResponseBody> | null> {
    return this._do(HTTP_PATCH, request);
  }

  post<TRequestBody, TResponseBody>(request: HttpRequest<TRequestBody>): Promise<HttpResponse<TResponseBody> | null> {
    return this._do(HTTP_POST, request);
  }

  put<TRequestBody, TResponseBody>(request: HttpRequest<TRequestBody>): Promise<HttpResponse<TResponseBody> | null> {
    return this._do(HTTP_PUT, request);
  }

  private async _do<TRequestBody, TResponseBody>(
    httpMethod: string,
    request: HttpRequest<TRequestBody>
  ): Promise<HttpResponse<TResponseBody>> {
    // Danielle removed batch

    const parsedRequest = await this._parseRequest(httpMethod, await this._beforeRequestHandler(request));

    const clientRequestId = this._getHeaderValue(
      parsedRequest.init.headers as Headers | Record<string, string>,
      X_MS_CLIENT_REQUEST_ID,
      Guid.raw
    );
    //const startDuration = this._analytics.performanceNow();

    let rawResponse: Response | undefined;
    try {
      //this._analytics.logHttpRequestStart(MSLA_REQUEST, httpMethod, parsedRequest.url, clientRequestId);

      const response = await window.fetch(parsedRequest.url, parsedRequest.init);
      rawResponse = response;

      const body = await this._getResponseBody<TRequestBody>(request, response);
      const { headers, ok, status, url } = rawResponse;
      const httpResponse: HttpResponse<any> = {
        body,
        headers: this._setClientRequestIdInResponse(headers, clientRequestId),
        ok,
        status,
        url,
      };

      // this._analytics.logHttpRequestEnd(
      //     MSLA_REQUEST,
      //     httpMethod,
      //     parsedRequest.url,
      //     this._extractResponseData(rawResponse),
      //     this._analytics.performanceNow() - startDuration,
      //     clientRequestId
      // );

      return httpResponse;
    } catch (error) {
      // this._analytics.logHttpRequestEnd(
      //     MSLA_REQUEST,
      //     httpMethod,
      //     parsedRequest.url,
      //     this._extractResponseData(rawResponse),
      //     this._analytics.performanceNow() - startDuration,
      //     clientRequestId,
      //     {
      //         error: error.stack ? error.stack : error.toString(),
      //     }
      // );

      throw error;
    }
  }

  private _getHeaderValue(headers: Headers | Record<string, string>, name: string, defaultValue: () => string): string {
    if (!headers) {
      return defaultValue();
    }

    if (headers instanceof Headers) {
      if (headers.has(name)) {
        return headers.get(name)!;
      } else {
        return defaultValue();
      }
    } else if (Object.prototype.hasOwnProperty.call(headers, name)) {
      return (headers as Record<string, string>)[name];
    } else {
      return defaultValue();
    }
  }

  private _extractResponseData(response: Response | undefined): ResponseData {
    if (!response) {
      return {
        status: -1,
      } as ResponseData;
    }

    const headers = response.headers || new Headers(),
      responseData = {
        status: response.status,
      } as ResponseData;

    if (headers.has(CONTENT_LENGTH)) {
      responseData.contentLength = parseInt(headers.get(CONTENT_LENGTH)!, 10);
    }

    if (headers.has(X_MS_REQUEST_ID)) {
      responseData.serviceRequestId = headers.get(X_MS_REQUEST_ID)!;
    }

    return responseData;
  }

  private _parseRequest<TRequestBody>(httpMethod: string, request: HttpRequest<TRequestBody>): ParsedRequest {
    let url: string = this._baseUrl || '',
      headers: Headers | Record<string, string>;
    const init: RequestInit = {
      method: httpMethod,
    };

    if (Object.prototype.hasOwnProperty.call(request, 'url')) {
      // url required for nextLink
      url = request.url!;
    }

    if (request.path) {
      url = this.pathCombine(url, request.path);
    }

    url = this._getFullPathUrl({ path: url, query: request.query });
    // eslint-disable-next-line prefer-const
    headers = request.headers || new Headers();

    if (!Object.prototype.hasOwnProperty.call(request, 'json')) {
      request.json = true;
    }

    if (request.json) {
      if (headers instanceof Headers) {
        if (!headers.has('ACCEPT_HEADER')) {
          // Danielle messing with this
          headers.set(ACCEPT_HEADER, MIME_APPLICATION_JSON);
        }
        headers.set(CONTENT_TYPE, MIME_APPLICATION_JSON);
        headers.set(X_MS_CLIENT_REQUEST_ID, Guid.raw());
        if (this._locale) {
          headers.set(ACCEPT_LANGUAGE, this._locale);
        }
      } else {
        const recordHeaders = headers as Record<string, string>;
        if (!headers['ACCEPT_HEADER']) {
          // Danielle messing with this
          recordHeaders[ACCEPT_HEADER] = MIME_APPLICATION_JSON;
        }
        recordHeaders[CONTENT_TYPE] = MIME_APPLICATION_JSON;
        recordHeaders[X_MS_CLIENT_REQUEST_ID] = Guid.raw();
        if (this._locale) {
          recordHeaders[ACCEPT_LANGUAGE] = this._locale;
        }
      }
    } else if (request.shouldIncludeClientRequestId) {
      if (headers instanceof Headers) {
        headers.set(X_MS_CLIENT_REQUEST_ID, Guid.raw());
      } else {
        (headers as Record<string, string>)[X_MS_CLIENT_REQUEST_ID] = Guid.raw();
      }
    }

    for (const key in HttpExtraHeaders) {
      if (HttpExtraHeaders[key]) {
        if (headers instanceof Headers) {
          headers.set(key, HttpExtraHeaders[key]);
        } else {
          (headers as Record<string, string>)[key] = HttpExtraHeaders[key];
        }
      }
    }

    init.headers = headers;

    if (Object.prototype.hasOwnProperty.call(request, 'body')) {
      if (request.json) {
        init.body = JSON.stringify(request.body);
      } else {
        init.body = request.body as any;
      }
    }

    const parsedRequest = { init, url } as ParsedRequest;

    return parsedRequest;
  }

  private _getFullPathUrl(path: string, query: QueryRecord): string {
    let relativeUrl = path;

    if (query) {
      relativeUrl += '?';
      Object.keys(query).forEach((queryKey) => {
        relativeUrl += `${encodeURIComponent(queryKey)}=${encodeURIComponent(query[queryKey])}&`;
      });
      relativeUrl = relativeUrl.substr(0, relativeUrl.length - 1);
    }

    return relativeUrl;
  }
}

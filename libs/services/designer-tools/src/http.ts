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

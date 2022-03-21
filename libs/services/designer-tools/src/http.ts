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

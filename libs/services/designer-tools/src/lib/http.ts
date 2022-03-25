import { AccessTokenHelper } from './common/accessTokenHelper';

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


// TODO: Implement adding header operation in all the services then remove this funcationality from http client;
let HttpExtraHeaders: Record<string, string>;

export interface HttpOptions {
  baseUrl: string;
  getAccessToken(): Promise<string>;
  locale: string;
}
                                                           
export class HttpClient {
    private _accessTokenHelper: AccessTokenHelper;
    private _baseUrl: string;
    private _beforeRequestHandler: BeforeRequestHandler;
    private _locale: string;

    public static createInstance(options: HttpOptions): HttpClient {
        return new HttpClient(options);
    }

    private static _defaultRequestHandler(request: HttpRequest<any>): Promise<HttpRequest<any>> {
        return Promise.resolve(request);
    }

    constructor(options: HttpOptions) {
        this._baseUrl = options.baseUrl;
        this._beforeRequestHandler = HttpClient._defaultRequestHandler;

        this._accessTokenHelper = new AccessTokenHelper(options.getAccessToken);

        this._locale = options.locale;
    }

    public async fetch(path: string): Promise<Response> {
        const token = await this._accessTokenHelper.getAccessToken();
        const headers = new Headers();
        headers.append("authorization", token);
        const idk: RequestInit = {headers}
        return await fetch(this._baseUrl+path, idk);
    }


   }

export interface ResponseData {
    status: number;
    contentLength?: number;
    serviceRequestId?: string;
    /* tslint:disable: no-any */
    responseBodyOnError?: any;
    data?: any;
    /* tslint:enable: no-any */
    hostName?: string;
    apiVersion?: string;
}



import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

interface BatchHttpMethods {
  GET: void;
  HEAD: void;
  POST: void;
  PUT: void;
  DELETE: void;
  PATCH: void;
}
/**
 * Http methods for batch ajax calls
 */
type BatchHttpMethod = keyof BatchHttpMethods;

export interface HttpRequestOptions<ContentType> {
  uri: string;
  type: BatchHttpMethod;
  content?: ContentType;
  queryParameters?: QueryParameters;
}

export interface QueryParameters {
  [paramName: string]: string | number;
}

export interface IHttpClient {
  dispose(): void;
  get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
  post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
}

let client: IHttpClient;

export const InitHttpClient = (httpClient: IHttpClient): void => {
  client = httpClient;
};

export const HttpClient = (): IHttpClient => {
  if (!client) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'HttpClient need to be initialized before using');
  }

  return client;
};

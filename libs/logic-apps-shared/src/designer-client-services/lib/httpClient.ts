/**
 * Http methods for batch ajax calls
 */
type BatchHttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HttpRequestOptions<ContentType> {
  uri: string;
  type?: BatchHttpMethod;
  content?: ContentType;
  headers?: Record<string, string | string[]>;
  queryParameters?: QueryParameters;
  noAuth?: boolean;
  includeAuth?: boolean;
  returnHeaders?: boolean;
}

export interface QueryParameters {
  [paramName: string]: string | number;
}

export interface IHttpClient {
  dispose(): void;
  get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
  post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
}

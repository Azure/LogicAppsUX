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
  type?: BatchHttpMethod;
  content?: ContentType;
  queryParameters?: QueryParameters;
}

export interface QueryParameters {
  [paramName: string]: string | number;
}

export interface IHttpClient {
  dispose(): void;
  get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
  post<BodyType, ReturnType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  put<BodyType, ReturnType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
}

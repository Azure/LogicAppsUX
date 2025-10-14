import axios from 'axios';

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
  skipBatch?: boolean;
}

export interface QueryParameters {
  [paramName: string]: string | number;
}

export interface IHttpClient {
  dispose(): void;
  get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
  post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  patch<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType>;
  delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType>;
}

export const httpClient: IHttpClient = {
  get: async <ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> => {
    const { uri, headers, queryParameters } = options;
    const axiosOptions = {
      headers,
      params: queryParameters,
    };
    const response = await axios.get(uri, axiosOptions);
    return response.data as ReturnType;
  },
  dispose: (): void => {
    throw new Error('Function not implemented.');
  },
  post: <ReturnType>(): Promise<ReturnType> => {
    throw new Error('Function not implemented.');
  },
  patch: <ReturnType>(): Promise<ReturnType> => {
    throw new Error('Function not implemented.');
  },
  put: <ReturnType>(): Promise<ReturnType> => {
    throw new Error('Function not implemented.');
  },
  delete: <ReturnType>(): Promise<ReturnType> => {
    throw new Error('Function not implemented.');
  },
};

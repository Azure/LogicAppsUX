/* eslint-disable @typescript-eslint/no-empty-function */
import type { HttpRequestOptions, IHttpClient } from '@microsoft-logic-apps/designer-client-services';

export class HttpClient implements IHttpClient {
  dispose(): void {}

  async get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    return {} as any;
  }
  async post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    return {} as any;
  }
}

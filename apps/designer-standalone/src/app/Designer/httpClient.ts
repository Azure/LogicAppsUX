/* eslint-disable @typescript-eslint/no-empty-function */
import type { HttpRequestOptions, IHttpClient } from '@microsoft-logic-apps/designer-client-services';

export class HttpClient implements IHttpClient {
  async get<ReturnType>(_options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    return {} as any;
    //   const request: Request = {

    //   }
    //   return fetch(_options.uri).then(
    //     response => {
    //       if (!response.ok) {
    //         return {} as any;
    //       }
    //       return response.json();
    //     }
    //   )
  }
  async post<ReturnType, BodyType>(_options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    return {} as any;
  }
  dispose(): void {}
}

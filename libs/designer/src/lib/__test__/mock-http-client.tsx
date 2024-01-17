import type { IHttpClient } from '@microsoft/designer-client-services-logic-apps';

export class MockHttpClient implements IHttpClient {
  dispose() {
    return;
  }
  get<ReturnType>() {
    const a: unknown = {};
    return a as ReturnType;
  }
  post<ReturnType>() {
    const a: unknown = {};
    return a as ReturnType;
  }
  put<ReturnType>() {
    const a: unknown = {};
    return a as ReturnType;
  }
  delete<ReturnType>() {
    const a: unknown = {};
    return a as ReturnType;
  }
}

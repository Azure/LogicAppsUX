import type { IHttpClient } from '../httpClient';

export interface TemplateServiceOptions {
  baseUrl: string;
  appId?: string;
  httpClient: IHttpClient;
  apiVersions: {
    subscription: string;
    gateway: string;
  };
  openBladeAfterCreate: (workflowName: string) => void;
}

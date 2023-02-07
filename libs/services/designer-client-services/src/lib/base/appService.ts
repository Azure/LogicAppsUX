import type { IAppServiceService } from '../appService';
import type { IHttpClient } from '../httpClient';
import { ArgumentException, equals } from '@microsoft/utils-logic-apps';

export interface BaseAppServiceServiceOptions {
  baseUrl: string;
  apiVersion: string;
  subscriptionId: string;
  httpClient: IHttpClient;
}

export class BaseAppServiceService implements IAppServiceService {
  constructor(public readonly options: BaseAppServiceServiceOptions) {
    const { apiVersion, subscriptionId, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  protected getAppServiceRequestPath(): string {
    return `/subscriptions/${this.options.subscriptionId}/providers/Microsoft.Web/sites`;
  }

  async fetchAppServices(): Promise<any> {
    const functionAppsResponse = await this.options.httpClient.get<any>({
      uri: this.getAppServiceRequestPath(),
      queryParameters: {
        'api-version': this.options.apiVersion,
        propertiesToInclude: 'SiteConfig',
      },
    });

    const apps = functionAppsResponse.value.filter(connectorIsAppService);
    return apps;
  }
}

// tslint:disable-next-line: no-any
function connectorIsAppService(connector: any): boolean {
  if (isFunctionContainer(connector.kind)) return false;

  const url = connector?.properties?.siteConfig?.apiDefinition?.url;
  const allowedOrigins = connector?.properties?.siteConfig?.cors;
  return url && allowedOrigins;
}

export function isFunctionContainer(kind: any): boolean {
  if (typeof kind !== 'string') return false;

  const kinds = kind.split(',');
  return (
    kinds.some(($kind) => equals($kind, 'functionapp')) && !kinds.some(($kind) => equals($kind, 'botapp') || equals($kind, 'workflowapp'))
  );
}

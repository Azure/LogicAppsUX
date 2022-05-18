import type { EnvironmentConfig, IUrlService } from '../urlService';

export interface StandardUrlServiceOptions {
  baseUrl: string;
  config: EnvironmentConfig;
  location: string;
  resourceGroup: string;
  subscriptionId: string;
  enableDynamicInvokeApi?: boolean;
  integrationAccountId?: string;
}
export class StandardUrlService implements IUrlService {
  constructor(public readonly options: StandardUrlServiceOptions) {}

  private _getCleanConnectionsPath(): string {
    // remove any possible starting and ending '/' Priti do we need to keep this?
    return this.options.config.connectionsPath.replace(/(^\/+)|(\/+$)/g, '');
  }

  public getConnectionsUri(): string {
    const connectionsPath = this._getCleanConnectionsPath();
    return `/subscriptions/${this.options.subscriptionId}/resourceGroups/${this.options.resourceGroup}/${connectionsPath}`;
  }

  public getListConnectionsUri(): string {
    return `${this.getAntaresResourceBaseUri()}/connections`;
  }

  getAntaresResourceBaseUri(): string {
    return `/subscriptions/${this.options.subscriptionId}/resourceGroups/${this.options.resourceGroup}/providers/Microsoft.Web`;
  }
}

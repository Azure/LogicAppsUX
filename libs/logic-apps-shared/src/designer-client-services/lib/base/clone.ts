import type { ICloneService } from '../clone';
import type { IHttpClient } from '../httpClient';

export interface BaseCloneServiceOptions {
  httpClient: IHttpClient;
  baseUrl: string;
  apiVersions: {
    gateway: string;
  };
}

export class BaseCloneService implements ICloneService {
  public instance: BaseCloneService = this;
  constructor(readonly options: BaseCloneServiceOptions) {}

  dispose(): void {
    return;
  }

  public getExistingWorkflowNames = async (resourceDetails: { subscriptionId: string; resourceGroup: string; logicAppName: string }) => {
    try {
      const { subscriptionId, resourceGroup, logicAppName } = resourceDetails;
      const appId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}`;
      const { baseUrl, apiVersions, httpClient } = this.options;
      const uri = `${baseUrl}${appId}/workflows`;
      const queryParameters = {
        'api-version': apiVersions.gateway,
      };

      const responseData: any = await httpClient.get({
        uri,
        queryParameters,
      });

      return responseData?.value?.map((workflow: any) => workflow.name.split('/')[1]) ?? [];
    } catch (_error: any) {
      return [];
    }
  };
}

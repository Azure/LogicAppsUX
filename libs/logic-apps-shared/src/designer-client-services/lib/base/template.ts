import { ArgumentException } from '../../../utils/src';
import type { ITemplateService } from '../template';
import type { IHttpClient } from '../httpClient';

export interface TemplateServiceOptions {
  baseUrl: string;
  appId?: string;
  httpClient: IHttpClient;
  apiVersions: {
    subscription: string;
    gateway: string;
  };
  openBladeAfterCreate: () => void;
}

export class BaseTemplateService implements ITemplateService {
  constructor(private readonly options: TemplateServiceOptions) {
    const { baseUrl, apiVersions } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }

    if (!apiVersions) {
      throw new ArgumentException('apiVersions required');
    }
  }

  dispose(): void {
    return;
  }

  public async getExistingWorkflowNames(): Promise<string[]> {
    try {
      const { baseUrl, appId, apiVersions, httpClient } = this.options;
      const uri = `${baseUrl}${appId}/workflows`;
      const queryParameters = {
        'api-version': apiVersions.gateway,
      };

      const responseData: any = await httpClient.get({
        uri,
        queryParameters,
      });

      return responseData?.value?.map((workflow: any) => workflow.name.split('/')[1]) ?? [];
    } catch (error: any) {
      return [];
    }
  }

  public openBladeAfterCreate = (): void => this.options.openBladeAfterCreate();
}

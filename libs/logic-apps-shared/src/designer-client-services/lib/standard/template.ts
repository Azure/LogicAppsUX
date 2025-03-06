import { ArgumentException } from '../../../utils/src';
import { BaseTemplateService, type BaseTemplateServiceOptions } from '../base/template';

interface StandardTemplateServiceOptions extends BaseTemplateServiceOptions {
  appId?: string;
  apiVersions: {
    subscription: string;
    gateway: string;
  };
}

export class StandardTemplateService extends BaseTemplateService {
  constructor(override readonly options: StandardTemplateServiceOptions) {
    super(options);
    const { baseUrl, apiVersions } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }

    if (!apiVersions) {
      throw new ArgumentException('apiVersions required');
    }
  }

  async getExistingWorkflowNames(): Promise<string[]> {
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
    } catch (_error: any) {
      return [];
    }
  }
}

import { ArgumentException } from '../../../utils/src';
import { BaseTemplateService, type BaseTemplateServiceOptions } from '../base/template';

interface ConsumptionTemplateServiceOptions extends BaseTemplateServiceOptions {
  apiVersion: string;
}

export class ConsumptionTemplateService extends BaseTemplateService {
  constructor(override readonly options: ConsumptionTemplateServiceOptions) {
    super(options);
    const { apiVersion } = options;

    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
  }

  async isResourceAvailable(resourceId: string): Promise<boolean> {
    try {
      const { baseUrl, httpClient, apiVersion } = this.options;
      const uri = `${baseUrl}${resourceId}`;
      const queryParameters = {
        'api-version': apiVersion,
      };

      await httpClient.get({ uri, queryParameters });
      return false;
    } catch (error: any) {
      if (error?.status === 404) {
        return true;
      }

      return false;
    }
  }
}

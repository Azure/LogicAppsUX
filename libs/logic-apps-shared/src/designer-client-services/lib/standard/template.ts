import { ArgumentException } from '../../../utils/src';
import type { TemplateServiceOptions } from '../base/template';
import type { ITemplateService } from '../template';

export class StandardTemplateService implements ITemplateService {
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

  public openBladeAfterCreate = (workflowName: string): void => this.options.openBladeAfterCreate(workflowName);
}

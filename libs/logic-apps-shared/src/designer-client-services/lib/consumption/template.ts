import { ArgumentException } from '../../../utils/src';
import type { TemplateServiceOptions } from '../base/template';
import type { ITemplateService } from '../template';

export class ConsumptionTemplateService implements ITemplateService {
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
    return [];
  }

  public openBladeAfterCreate = (workflowName: string): void => this.options.openBladeAfterCreate(workflowName);
}

import type { BaseTemplateServiceOptions } from '../base/template';
import type { ITemplateService } from '../template';

export class ConsumptionTemplateService implements ITemplateService {
  constructor(private readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public async getExistingWorkflowNames(): Promise<string[]> {
    return [];
  }

  public openBladeAfterCreate = (workflowName: string): void => this.options.openBladeAfterCreate(workflowName);
}

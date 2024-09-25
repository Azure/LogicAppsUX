import type { TemplateServiceOptions } from '../base/template';
import type { ITemplateService } from '../template';

export class ConsumptionTemplateService implements ITemplateService {
  constructor(private readonly options: TemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public async getExistingWorkflowNames(): Promise<string[]> {
    return [];
  }

  public openBladeAfterCreate = (workflowName: string): void => this.options.openBladeAfterCreate(workflowName);
}

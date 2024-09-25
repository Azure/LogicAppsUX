import { BaseTemplateService } from '../base/template';

export class ConsumptionTemplateService extends BaseTemplateService {
  public async getExistingWorkflowNames(): Promise<string[]> {
    return [];
  }
}

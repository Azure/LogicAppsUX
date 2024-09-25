import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  openBladeAfterCreate: (workflowName: string) => void;
}

export abstract class BaseTemplateService implements ITemplateService {
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  abstract getExistingWorkflowNames(): Promise<string[]>;

  public openBladeAfterCreate = (workflowName: string): void => this.options.openBladeAfterCreate(workflowName);
}

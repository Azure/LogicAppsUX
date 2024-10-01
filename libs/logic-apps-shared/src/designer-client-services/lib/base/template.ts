import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  openBladeAfterCreate: (workflowName: string) => void;
}

export class BaseTemplateService implements ITemplateService {
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string): void => this.options.openBladeAfterCreate(workflowName);
}

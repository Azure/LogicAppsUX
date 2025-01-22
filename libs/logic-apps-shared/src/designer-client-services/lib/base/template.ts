import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  openBladeAfterCreate: (workflowName: string | undefined) => void;
  onAddBlankWorkflow: () => void | Promise<void>;
  getCustomResource?: (resourcePath: string, artifactType?: string) => Promise<any>;
}

export class BaseTemplateService implements ITemplateService {
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string | undefined): void => this.options.openBladeAfterCreate(workflowName);

  public onAddBlankWorkflow = (): void | Promise<void> => this.options.onAddBlankWorkflow();

  public getCustomResource = async (resourcePath: string): Promise<any> => this.options?.getCustomResource?.(resourcePath);
}

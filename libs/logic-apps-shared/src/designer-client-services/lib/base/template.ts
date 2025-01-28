import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  openBladeAfterCreate: (workflowName: string | undefined) => void;
  onAddBlankWorkflow: () => Promise<void>;
  getCustomResource?: (resourcePath: string, artifactType?: string) => Promise<any> | undefined;
}

export class BaseTemplateService implements ITemplateService {
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string | undefined): void => this.options.openBladeAfterCreate(workflowName);

  public onAddBlankWorkflow = (): Promise<void> => this.options.onAddBlankWorkflow();

  public getCustomResource = (resourcePath: string): Promise<any> | undefined => this.options?.getCustomResource?.(resourcePath);
}

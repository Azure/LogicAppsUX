import type * as Template from '../../../utils/src/lib/models/template';
import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  openBladeAfterCreate: (workflowName: string | undefined) => void;
  onAddBlankWorkflow: () => void;
  getCustomManifestNames?: () => Promise<string[]>;
  getCustomManifest?: (resourcePath: string) => Promise<Template.Manifest>;
}

export class BaseTemplateService implements ITemplateService {
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string | undefined): void => this.options.openBladeAfterCreate(workflowName);

  public onAddBlankWorkflow = (): void => this.options.onAddBlankWorkflow();

  // public getCustomManifestNames = (): Promise<string[]> | undefined => this.options?.getCustomManifestNames?.();
  // public getCustomManifest = (resourcePath: string): Promise<Template.Manifest> => this.options.getCustomManifest(resourcePath);
}

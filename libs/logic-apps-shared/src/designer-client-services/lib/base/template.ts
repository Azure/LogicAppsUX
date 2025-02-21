import type { LogicAppsV2, Template } from '../../../utils/src';
import type { IHttpClient } from '../httpClient';
import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  httpClient: IHttpClient;
  endpoint: string;
  openBladeAfterCreate: (workflowName: string | undefined) => void;
  onAddBlankWorkflow: () => Promise<void>;
  getContentPathUrl?: (templateName: string, resourcePath: string) => string;
}

export class BaseTemplateService implements ITemplateService {
  public instance: BaseTemplateService = this;
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string | undefined): void => this.options.openBladeAfterCreate(workflowName);

  public onAddBlankWorkflow = (): Promise<void> => this.options.onAddBlankWorkflow();

  public getContentPathUrl = (templateName: string, resourcePath: string): string => {
    const { endpoint, getContentPathUrl } = this.options;
    return getContentPathUrl ? getContentPathUrl(templateName, resourcePath) : `${endpoint}/templates/${templateName}/${resourcePath}`;
  };

  public getAllTemplateNames = async (): Promise<string[]> => {
    const response = await this.options.httpClient.get<any>({
      uri: `${this.options.endpoint}/templates/manifest.json`,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

    return response;
  };

  public getResourceManifest = async (resourcePath: string): Promise<Template.Manifest> => {
    return this.options.httpClient.get<any>({
      uri: `${this.options.endpoint}/templates/${resourcePath}/manifest.json`,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  };

  public getWorkflowDefinition = async (resourcePath: string): Promise<LogicAppsV2.WorkflowDefinition> => {
    return this.options.httpClient.get<any>({
      uri: `${this.options.endpoint}/templates/${resourcePath}/workflow.json`,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  };
}

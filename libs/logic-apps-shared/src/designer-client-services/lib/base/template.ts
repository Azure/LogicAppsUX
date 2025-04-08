import type { LogicAppsV2, Template } from '../../../utils/src';
import type { IHttpClient } from '../httpClient';
import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  baseUrl: string;
  httpClient: IHttpClient;
  endpoint: string;
  useEndpointForTemplates: boolean;
  openBladeAfterCreate?: (workflowName: string | undefined) => void;
  onAddBlankWorkflow?: () => Promise<void>;
}

export class BaseTemplateService implements ITemplateService {
  public instance: BaseTemplateService = this;
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string | undefined): void => this.options.openBladeAfterCreate?.(workflowName);

  public onAddBlankWorkflow = (): Promise<void> =>
    this.options.onAddBlankWorkflow ? this.options.onAddBlankWorkflow() : Promise.resolve();

  public getContentPathUrl = (templatePath: string, resourcePath: string): string => {
    const { endpoint } = this.options;
    const resourceName = resourcePath.split('/').pop();
    return `${endpoint}/${templatePath}/${resourceName}`;
  };

  public getAllTemplateNames = async (): Promise<string[]> => {
    const { httpClient, endpoint } = this.options;
    return httpClient.get<any>({ uri: `${endpoint}/manifest.json`, headers: { 'Access-Control-Allow-Origin': '*' } });
  };

  public getResourceManifest = async (resourcePath: string): Promise<Template.TemplateManifest | Template.WorkflowManifest> => {
    const { httpClient, endpoint } = this.options;
    return httpClient.get<any>({
      uri: `${endpoint}/${resourcePath}/manifest.json`,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  };

  public getWorkflowDefinition = async (templateId: string, workflowId: string): Promise<LogicAppsV2.WorkflowDefinition> => {
    const { httpClient, endpoint } = this.options;
    return httpClient.get<any>({
      uri: `${endpoint}/${templateId}/${workflowId}/workflow.json`,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  };
}

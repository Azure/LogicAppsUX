import type { LogicAppsV2, Template } from '../../../utils/src';
import type { IHttpClient } from '../httpClient';
import type { ITemplateService } from '../template';

export interface BaseTemplateServiceOptions {
  httpClient: IHttpClient;
  endpoint: string;
  useEndpointForTemplates: boolean;
  openBladeAfterCreate: (workflowName: string | undefined) => void;
  onAddBlankWorkflow: () => Promise<void>;
}

export class BaseTemplateService implements ITemplateService {
  public instance: BaseTemplateService = this;
  constructor(readonly options: BaseTemplateServiceOptions) {}

  dispose(): void {
    return;
  }

  public openBladeAfterCreate = (workflowName: string | undefined): void => this.options.openBladeAfterCreate(workflowName);

  public onAddBlankWorkflow = (): Promise<void> => this.options.onAddBlankWorkflow();

  public getContentPathUrl = (templatePath: string, resourcePath: string): string => {
    const { endpoint, useEndpointForTemplates } = this.options;
    return useEndpointForTemplates ? `${endpoint}/templates/${templatePath}/${resourcePath}` : resourcePath;
  };

  public getAllTemplateNames = async (): Promise<string[]> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    return useEndpointForTemplates
      ? httpClient.get<any>({ uri: `${endpoint}/templates/manifest.json`, headers: { 'Access-Control-Allow-Origin': '*' } })
      : ((await import('./../templates/manifest.json'))?.default as string[]);
  };

  public getTemplateManifest = async (templateId: string): Promise<Template.TemplateManifest> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    if (useEndpointForTemplates) {
      return httpClient.get<any>({
        uri: `${endpoint}/templates/${templateId}/manifest.json`,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return (await import(`./../templates/${templateId}/manifest.json`)).default;
  };

  public getWorkflowManifest = async (templateId: string, workflowId: string): Promise<Template.WorkflowManifest> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    if (useEndpointForTemplates) {
      return httpClient.get<any>({
        uri: `${endpoint}/templates/${templateId}/${workflowId}/manifest.json`,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return (await import(`./../templates/${templateId}/${workflowId}/manifest.json`)).default;
  };

  public getWorkflowDefinition = async (templateId: string, workflowId: string): Promise<LogicAppsV2.WorkflowDefinition> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    if (useEndpointForTemplates) {
      return httpClient.get<any>({
        uri: `${endpoint}/templates/${templateId}/${workflowId}/workflow.json`,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return (await import(`./../templates/${templateId}/${workflowId}/workflow.json`)).default;
  };
}

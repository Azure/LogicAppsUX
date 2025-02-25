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

  public getContentPathUrl = (templateName: string, resourcePath: string): string => {
    const { endpoint, useEndpointForTemplates } = this.options;
    return useEndpointForTemplates ? `${endpoint}/templates/${templateName}/${resourcePath}` : resourcePath;
  };

  public getAllTemplateNames = async (): Promise<string[]> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    return useEndpointForTemplates
      ? httpClient.get<any>({ uri: `${endpoint}/templates/manifest.json`, headers: { 'Access-Control-Allow-Origin': '*' } })
      : ((await import('./../templates/manifest.json'))?.default as string[]);
  };

  public getResourceManifest = async (resourcePath: string): Promise<Template.Manifest> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    if (useEndpointForTemplates) {
      return httpClient.get<any>({
        uri: `${endpoint}/templates/${resourcePath}/manifest.json`,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const paths = resourcePath.split('/');

    return paths.length === 2
      ? (await import(`./../templates/${paths[0]}/${paths[1]}/manifest.json`)).default
      : (await import(`./../templates/${resourcePath}/manifest.json`)).default;
  };

  public getWorkflowDefinition = async (resourcePath: string): Promise<LogicAppsV2.WorkflowDefinition> => {
    const { httpClient, endpoint, useEndpointForTemplates } = this.options;
    if (useEndpointForTemplates) {
      return httpClient.get<any>({
        uri: `${endpoint}/templates/${resourcePath}/workflow.json`,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const paths = resourcePath.split('/');

    return paths.length === 2
      ? (await import(`./../templates/${paths[0]}/${paths[1]}/workflow.json`)).default
      : (await import(`./../templates/${resourcePath}/workflow.json`)).default;
  };
}

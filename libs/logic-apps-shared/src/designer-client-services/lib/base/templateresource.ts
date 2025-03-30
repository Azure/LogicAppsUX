import type { Template } from '../../../index';
import type { IHttpClient } from '../httpClient';
import type { ITemplateResourceService, WorkflowData } from '../templateresource';

interface ITemplateResourceServiceOptions {
  httpClient: IHttpClient;
  baseUrl: string;
  apiVersion: string;
}

export class BaseTemplateResourceService implements ITemplateResourceService {
  constructor(private readonly options: ITemplateResourceServiceOptions) {}

  public async getTemplate(id: string) {
    return Promise.resolve({
      id,
      properties: {},
    } as any);
  }

  public async getTemplateWorkflows(_id: string) {
    // NOTE: Make sure when you get all workflow ids, use the toLowerCase() for the key and id inside workflow manifest should be normal id.
    return Promise.resolve([]);
  }

  public async updateTemplate(_id: string, _manifest: Template.TemplateManifest) {
    throw new Error('Method not implemented.');
  }

  public async updateWorkflow(_id: string, _data: WorkflowData) {
    throw new Error('Method not implemented.');
  }

  public async createArtifact(_id: string, _artifact: Template.Artifact) {
    throw new Error('Method not implemented.');
  }

  public async isWorkflowNameAvailable(_id: string, _name: string) {
    return true;
  }
}

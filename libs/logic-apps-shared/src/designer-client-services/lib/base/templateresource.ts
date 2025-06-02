import { getResourceNameFromId, type ArmResource, type Template } from '../../../index';
import { getAzureResourceRecursive } from '../common/azure';
import { getTemplateManifestFromResourceManifest } from '../helpers';
import type { IHttpClient } from '../httpClient';
import type { ITemplateResourceService, WorkflowData } from '../templateresource';

interface ITemplateResourceServiceOptions {
  httpClient: IHttpClient;
  baseUrl: string;
  apiVersion: string;
}

export class BaseTemplateResourceService implements ITemplateResourceService {
  constructor(private readonly options: ITemplateResourceServiceOptions) {}

  public async getTemplate(resourceId: string) {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const uri = `${baseUrl}${resourceId}`;
    const response = await httpClient.get<ArmResource<any>>({ uri, queryParameters: { 'api-version': apiVersion } });
    const manifest = response?.properties?.manifest;
    if (manifest) {
      response.properties.manifest = getTemplateManifestFromResourceManifest(manifest);
    }

    return response;
  }

  public async getTemplateWorkflows(resourceId: string, rawData = false) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}/workflows`;
      const response = await getAzureResourceRecursive(httpClient, uri, { 'api-version': apiVersion });
      return rawData
        ? response
        : response.map((workflow: ArmResource<any>) => {
            const manifest = workflow?.properties?.manifest;
            const workflowId = getResourceNameFromId(workflow.id);
            if (manifest) {
              manifest.kinds = manifest.allowedKinds;
              manifest.description = manifest.details;

              delete manifest.allowedKinds;
              delete manifest.details;

              manifest.id = workflowId;
              workflow.properties.manifest = manifest;
            } else {
              workflow.properties.manifest = { id: workflowId };
            }

            return workflow;
          });
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }
      // Handle other errors
      throw error;
    }
  }

  public async updateTemplate(resourceId: string, manifest?: Template.TemplateManifest, state?: string) {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const uri = `${baseUrl}${resourceId}`;
    const manifestToUpdate: any = manifest ? { ...manifest } : undefined;

    if (manifest) {
      manifestToUpdate.supportedSkus = manifest.skus.join(',');
      manifestToUpdate.keywords = (manifest.tags ?? []).map((tag: string) => tag.trim());

      delete manifestToUpdate.id;
      delete manifestToUpdate.workflows;
      delete manifestToUpdate.skus;
      delete manifestToUpdate.tags;
    }

    await httpClient.patch({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        properties: { state, manifest: manifestToUpdate },
      },
    });
  }

  public async addWorkflow(resourceId: string, workflowName: string, data: WorkflowData) {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const uri = `${baseUrl}${resourceId}/workflows/${workflowName}`;
    const manifest: any = { ...data.manifest, details: data.manifest?.description, allowedKinds: data.manifest?.kinds };

    delete manifest.id;
    delete manifest.kinds;
    delete manifest.description;

    if (data.workflow) {
      manifest.artifacts = (manifest.artifacts ?? []).filter((artifact: any) => artifact.type !== 'workflow');
      manifest.artifacts.push({
        type: 'workflow',
        file: data.workflow,
      });
    }

    await httpClient.put({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        properties: { manifest },
      },
    });
  }

  public async updateWorkflow(resourceId: string, workflowName: string, manifest: Partial<Template.WorkflowManifest>, rawData = false) {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const uri = `${baseUrl}${resourceId}/workflows/${workflowName}`;
    const requestOptions = {
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        properties: { manifest },
      },
    };

    if (rawData) {
      await httpClient.put(requestOptions);
    } else {
      await httpClient.patch(requestOptions);
    }
  }

  public async deleteWorkflow(resourceId: string, workflowName: string) {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const uri = `${baseUrl}${resourceId}/workflows/${workflowName}`;
    await httpClient.delete({ uri, queryParameters: { 'api-version': apiVersion } });
  }

  public async deleteAllWorkflows(resourceId: string) {
    const workflows = await this.getTemplateWorkflows(resourceId);
    await Promise.all(workflows.map((workflow) => this.deleteWorkflow(resourceId, workflow.name)));
  }

  public async createArtifact(_id: string, _artifact: Template.Artifact) {
    throw new Error('Method not implemented.');
  }
}

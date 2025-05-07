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
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}`;
      const response = await httpClient.get<ArmResource<any>>({ uri, queryParameters: { 'api-version': apiVersion } });
      const manifest = response?.properties?.manifest;
      if (manifest) {
        response.properties.manifest = getTemplateManifestFromResourceManifest(manifest);
      }

      return response;
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async getTemplateWorkflows(resourceId: string) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}/workflows`;
      const response = await getAzureResourceRecursive(httpClient, uri, { 'api-version': apiVersion });
      return response.map((workflow: ArmResource<any>) => {
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
      throw new Error(error as any);
    }
  }

  public async updateState(resourceId: string, state: string) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}`;

      await httpClient.patch({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content: {
          properties: { state },
        },
      });
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async updateTemplate(resourceId: string, manifest: Template.TemplateManifest, state?: string) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}`;
      const manifestToUpdate: any = { ...manifest };
      manifestToUpdate.supportedSkus = manifest.skus.join(',');
      manifestToUpdate.keywords = (manifest.tags ?? []).map((tag: string) => tag.trim());

      delete manifestToUpdate.id;
      delete manifestToUpdate.workflows;
      delete manifestToUpdate.skus;
      delete manifestToUpdate.tags;

      await httpClient.patch({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content: {
          properties: { state, manifest: manifestToUpdate },
        },
      });
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async addWorkflow(resourceId: string, workflowName: string, data: WorkflowData) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}/workflows/${workflowName}`;
      const manifest: any = { ...data.manifest, details: data.manifest?.description, allowedKinds: data.manifest?.kinds };

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
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async updateWorkflow(resourceId: string, workflowName: string, manifest: Partial<Template.WorkflowManifest>) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}/workflows/${workflowName}`;
      await httpClient.patch({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content: {
          properties: { manifest },
        },
      });
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async deleteWorkflow(resourceId: string, workflowName: string) {
    try {
      const { baseUrl, apiVersion, httpClient } = this.options;
      const uri = `${baseUrl}${resourceId}/workflows/${workflowName}`;
      await httpClient.delete({ uri, queryParameters: { 'api-version': apiVersion } });
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async deleteAllWorkflows(resourceId: string) {
    try {
      const workflows = await this.getTemplateWorkflows(resourceId);
      await Promise.all(workflows.map((workflow) => this.deleteWorkflow(resourceId, workflow.name)));
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async createArtifact(_id: string, _artifact: Template.Artifact) {
    throw new Error('Method not implemented.');
  }

  public async isWorkflowNameAvailable(_id: string, _name: string) {
    return true;
  }
}

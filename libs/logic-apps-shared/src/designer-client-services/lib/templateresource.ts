import type { ArmResource, LogicAppsV2, Template } from '../../utils/src';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface WorkflowData {
  manifest?: Template.WorkflowManifest;
  workflow?: LogicAppsV2.WorkflowDefinition;
}

export interface ITemplateResourceService {
  getTemplate: (id: string) => Promise<ArmResource<any>>;
  getTemplateWorkflows: (id: string) => Promise<ArmResource<any>[]>;
  updateTemplate: (id: string, manifest: Template.TemplateManifest) => Promise<void>;
  updateWorkflow: (id: string, data: WorkflowData) => Promise<void>;
  createArtifact: (templateId: string, artifact: Template.Artifact) => Promise<void>;
  isWorkflowNameAvailable: (id: string, name: string) => Promise<boolean>;
}

let service: ITemplateResourceService;

export const InitTemplateResourceService = (templateService: ITemplateResourceService): void => {
  service = templateService;
};

export const TemplateResourceService = (): ITemplateResourceService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'Template Resource Service needs to be initialized before using'
    );
  }

  return service;
};

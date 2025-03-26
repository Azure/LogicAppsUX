import type { LogicAppsV2, Template } from '../../utils/src';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface ITemplateService {
  getExistingWorkflowNames?: () => Promise<string[]>;
  isResourceAvailable?: (resourceId: string) => Promise<boolean>;
  openBladeAfterCreate?: (workflowName: string | undefined) => void;
  onAddBlankWorkflow?: () => Promise<void>;
  getAllTemplateNames: () => Promise<string[]>;
  getResourceManifest: (resourcePath: string) => Promise<Template.TemplateManifest | Template.WorkflowManifest>;
  getWorkflowDefinition: (templateId: string, workflowId: string) => Promise<LogicAppsV2.WorkflowDefinition>;
  getContentPathUrl: (templatePath: string, resourcePath: string) => string;
}

let service: ITemplateService;

export const InitTemplateService = (templateService: ITemplateService): void => {
  service = templateService;
};

export const TemplateService = (): ITemplateService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Template Service needs to be initialized before using');
  }

  return service;
};

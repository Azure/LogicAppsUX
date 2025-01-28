import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface ITemplateService {
  getExistingWorkflowNames?: () => Promise<string[]>;
  openBladeAfterCreate: (workflowName: string | undefined) => void;
  onAddBlankWorkflow: () => Promise<void>;
  getCustomResource?: (resourcePath: string, artifactType?: string) => Promise<any> | undefined;
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

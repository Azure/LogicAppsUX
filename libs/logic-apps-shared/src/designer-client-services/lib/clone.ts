import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface ICloneService {
  getExistingWorkflowNames: (resourceDetails: { subscriptionId: string; resourceGroup: string; logicAppName: string }) => Promise<string[]>;
  openBladeAfterCreate: (workflowId: string, location: string) => void;
}

let service: ICloneService;

export const InitCloneService = (cloneService: ICloneService): void => {
  service = cloneService;
};

export const CloneService = (): ICloneService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Clone Service needs to be initialized before using');
  }

  return service;
};

import { AssertionException, AssertionErrorCode } from '../../utils/src';

export interface IExperimentationService {
  isFeatureEnabled: (featureGateName: string) => Promise<boolean>;
  // Setting the return as any since depending on the feature, you can return a string, number or a boolean
  getFeatureValue: (featureGateName: string, type: 'string' | 'number' | 'boolean') => Promise<any>;
}

let service: IExperimentationService;

export const InitExperimentationServiceService = (experimentationService: IExperimentationService): void => {
  service = experimentationService;
};

export const ExperimentationService = (): IExperimentationService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'Experimentation Service needs to be initialized before using'
    );
  }

  return service;
};

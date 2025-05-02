import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface ICognitiveServiceService {
  fetchAllCognitiveServiceAccounts(): Promise<any>;
}

let service: ICognitiveServiceService;

export const InitCognitiveServiceService = (cognitiveService: ICognitiveServiceService): void => {
  service = cognitiveService;
};

export const CognitiveServiceService = (): ICognitiveServiceService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'CognitiveServiceService needs to be initialized before using'
    );
  }

  return service;
};

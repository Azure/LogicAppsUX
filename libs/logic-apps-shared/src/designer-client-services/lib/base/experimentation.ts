import type { IExperimentationService } from '../experimentation';

export class BaseExperimentationService implements IExperimentationService {
  isFeatureEnabled(_featureGateName: string, _type: 'extension' | 'shell') {
    return Promise.resolve(false);
  }

  getFeatureValue(_featureGateName: string, _type: 'extension' | 'shell') {
    return Promise.resolve(undefined);
  }
}

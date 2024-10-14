import type { IExperimentationService } from '../experimentation';

export class BaseExperimentationService implements IExperimentationService {
  isFeatureEnabled(_featureGateName: string) {
    return Promise.resolve(false);
  }

  getFeatureValue(_featureGateName: string, _type: 'string' | 'number' | 'boolean') {
    return Promise.resolve(undefined);
  }
}

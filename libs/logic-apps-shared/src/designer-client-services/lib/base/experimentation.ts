import type { IExperimentationService } from '../experimentation';

export class BaseExperimentationService implements IExperimentationService {
  isFeatureEnabled(_featureGateName: string) {
    return Promise.resolve(true);
  }

  getFeatureValue(_featureGateName: string, _type: 'string' | 'number' | 'boolean') {
    return Promise.resolve(undefined);
  }
}

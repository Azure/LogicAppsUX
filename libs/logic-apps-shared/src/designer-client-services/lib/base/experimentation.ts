import type { IExperimentationService } from '../experimentation';

export class BaseExperimentationService implements IExperimentationService {
  isFeatureEnabled(_featureGateName: string, _assignmentType: 'extension' | 'shell') {
    return Promise.resolve(false);
  }

  getFeatureValue(_featureGateName: string, _assignmentType: 'extension' | 'shell', _type: 'string' | 'number' | 'boolean') {
    return Promise.resolve(undefined);
  }
}

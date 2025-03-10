import { AssertionErrorCode, AssertionException } from '../../utils/src';

export type Resource = { id: string; name: string; displayName: string };
export type LogicAppResource = { id: string; name: string; kind: 'standard' | 'consumption' };

export interface IResourceService {
  listSubscriptions: () => Promise<Resource[]>;
  listResourceGroups: (subscriptionId: string) => Promise<Resource[]>;
  listLocations: (subscriptionId: string) => Promise<Resource[]>;
  listLogicApps: (subscriptionId: string, resourceGroup: string) => Promise<LogicAppResource[]>;
}

let service: IResourceService;

export const InitResourceService = (templateService: IResourceService): void => {
  service = templateService;
};

export const ResourceService = (): IResourceService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Template Service needs to be initialized before using');
  }

  return service;
};

import type { ArmResource, HTTP_METHODS } from '../../utils/src';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export type Resource = { id: string; name: string; displayName: string };
export type LogicAppResource = { id: string; name: string; location: string; resourceGroup: string; plan: 'Standard' | 'Consumption' };
export type WorkflowResource = { id: string; name: string; triggerType: string };

export interface IResourceService {
  listSubscriptions: () => Promise<Resource[]>;
  listResourceGroups: (subscriptionId: string) => Promise<Resource[]>;
  listLocations: (subscriptionId: string) => Promise<Resource[]>;
  listLogicApps: (subscriptionId: string, resourceGroup?: string, optionalQuery?: string) => Promise<LogicAppResource[]>;
  listAllLogicApps: (subscriptionId: string, resourceGroup: string) => Promise<LogicAppResource[]>;
  listWorkflowsInApp: (
    subscriptionId: string,
    resourceGroup: string,
    logicAppName: string,
    filter?: (workflow: ArmResource<any>) => boolean
  ) => Promise<WorkflowResource[]>;
  listResources: (subscriptionId: string, query: string) => Promise<ArmResource<any>[]>;
  getResource: (resourceId: string, queryParameters: Record<string, string>) => Promise<ArmResource<any>>;
  executeResourceAction: (resourceId: string, action: HTTP_METHODS, queryParameters: Record<string, string>, content?: any) => Promise<any>;
  executeHttpCall: (uri: string, action: HTTP_METHODS, content?: any) => Promise<any>;
}

let service: IResourceService;

export const InitResourceService = (templateService: IResourceService): void => {
  service = templateService;
};

export const ResourceService = (): IResourceService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Resource Service needs to be initialized before using');
  }

  return service;
};

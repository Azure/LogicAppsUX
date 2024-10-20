import type { SwaggerParser } from '../../parsers';
import { AssertionErrorCode, AssertionException } from '../../utils/src';
import type { ListDynamicValue } from './connector';

export interface ApiMSubscriptionSecrets {
  primaryKey: string;
  secondaryKey: string;
}

export interface IApiManagementService {
  fetchApiManagementInstances(): Promise<any>;
  fetchApisInApiM(apimInstanceId: string): Promise<any>;
  fetchApiMSwagger(apimApiId: string): Promise<SwaggerParser>;
  fetchApiMKeys(apimInstanceId: string, subscriptionName: string): Promise<ApiMSubscriptionSecrets>;
  getOperations(apimApiId: string): Promise<ListDynamicValue[]>;
  getOperationSchema(apimApiId: string, operationId: string, isInput: boolean): Promise<any>;
}

let service: IApiManagementService;

export const InitApiManagementService = (apimService: IApiManagementService): void => {
  service = apimService;
};

export const ApiManagementService = (): IApiManagementService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ApiManagementService needs to be initialized before using');
  }

  return service;
};

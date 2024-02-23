import type { ListDynamicValue } from './connector';
import type { SwaggerParser } from '@microsoft/logic-apps-shared';
import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

export interface IApiManagementService {
  fetchApiManagementInstances(): Promise<any>;
  fetchApisInApiM(apimInstanceId: string): Promise<any>;
  fetchApiMSwagger(apimApiId: string): Promise<SwaggerParser>;
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

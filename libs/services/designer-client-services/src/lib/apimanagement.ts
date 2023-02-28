import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface IApiManagementService {
  fetchApiManagementInstances(): Promise<any>;
  fetchApisInApiM(apimInstanceId: string): Promise<any>;
  fetchApiMSwagger(apimApiId: string): Promise<any>;
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

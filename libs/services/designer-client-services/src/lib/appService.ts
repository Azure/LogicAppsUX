import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

export interface IAppServiceService {
  fetchAppServices(): Promise<any>;
  getOperationSchema(swaggerUrl: string, operationId: string, isInput: boolean, supportsAuthenticationParameter: boolean): Promise<any>;
  getOperations(swaggerUrl: string): Promise<any>;
}

let service: IAppServiceService;

export const InitAppServiceService = (appServiceService: IAppServiceService): void => {
  service = appServiceService;
};

export const AppServiceService = (): IAppServiceService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'AppServiceService needs to be initialized before using');
  }

  return service;
};

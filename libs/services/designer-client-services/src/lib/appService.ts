import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface IAppServiceService {
  [x: string]: any;
  fetchAppServices(): Promise<any>;
  fetchAppServiceApiSwagger(appService: any): Promise<any>;
  getOperationSchema(swaggerUrl: string, operationData: any, isInput: boolean): Promise<any>;
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

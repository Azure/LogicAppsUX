import type { SwaggerParser } from '@microsoft/logic-apps-shared';
import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

export interface IFunctionService {
  fetchFunctionApps(): Promise<any>;
  fetchFunctionAppsFunctions(functionAppId: string): Promise<any>;
  fetchFunctionKey(functionId: string): Promise<any>;
  fetchFunctionAppSwagger(functionAppId: string): Promise<SwaggerParser>;
  getOperationSchema(swaggerUrl: string, operationId: string, isInput: boolean): Promise<any>;
  getOperations(swaggerUrl: string): Promise<any>;
}

let service: IFunctionService;

export const InitFunctionService = (functionService: IFunctionService): void => {
  service = functionService;
};

export const FunctionService = (): IFunctionService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'FunctionService needs to be initialized before using');
  }

  return service;
};

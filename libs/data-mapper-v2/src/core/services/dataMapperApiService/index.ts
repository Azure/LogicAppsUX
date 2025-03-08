import type { FunctionManifest } from '../../../models/Function';
import type { DataMapperApiServiceOptions } from './DataMapperApiService';
import { DataMapperApiService } from './DataMapperApiService';
import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

let service: IDataMapperApiService;

export const defaultDataMapperApiServiceOptions = {
  baseUrl: 'http://localhost',
  port: '8000',
  accessToken: '',
};

export interface IDataMapperApiService {
  getFunctionsManifest(): Promise<FunctionManifest>;
  getSchemaFile(schemaName: string, schemaFilePath: string): Promise<any>;
  generateDataMapXslt(dataMapDefinition: string): Promise<string>;
  testDataMap(dataMapXsltFilename: string, schemaInputValue: string): Promise<TestMapResponse>;
  getSchemaFileUri(schemaFilename: string, schemaFilePath: string): string;
}

export const InitDataMapperApiService = (options: DataMapperApiServiceOptions) => {
  service = new DataMapperApiService(options);
};

export const InitOtherDMService = (newService: IDataMapperApiService) => {
  service = newService;
};

export const DataMapperApiServiceInstance = (): IDataMapperApiService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'DataMapperApiService needs to be initialized before using');
  }

  return service;
};

export interface GenerateXsltResponse {
  xsltContent: string;
}

export interface TestMapResponse {
  statusCode: number;
  statusText: string;
  outputInstance?: {
    $content: string;
    '$content-type': string;
  };
}

export const dataMapperApiVersions = {
  Oct2019Edge: '2019-10-01-edge-preview',
};

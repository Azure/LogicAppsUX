import type { DataMapperApiServiceOptions } from './DataMapperApiService';
import { DataMapperApiService } from './DataMapperApiService';
import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

export interface IDataMapperApiService {
  getSchemas(): Promise<SchemaInfoProperties[]>;
  getSchemaFile(schemaName: string): Promise<any>;
}

export interface SchemaInfoProperties {
  name: string;
  size: number;
  mtime: string;
  crtime: string;
  mime: string;
  href: string;
  path: string;
}

export const defaultDataMapperApiServiceOptions = {
  baseUrl: 'http://localhost:7071',
  resourceUrl: '',
  accessToken: '',
};

export enum ResourceType {
  schemaList = 'schemaList',
}

let service: IDataMapperApiService;

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

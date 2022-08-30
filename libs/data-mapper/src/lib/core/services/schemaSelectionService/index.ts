import type { SchemaSelectionServiceOptions } from './SchemaSelectionService';
import { SchemaSelectionService } from './SchemaSelectionService';
import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

export interface ISchemaSelectionService {
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

export enum ResourceType {
  schemaList = 'schemaList',
}

let service: ISchemaSelectionService;

export const InitSchemaSelectionService = (options: SchemaSelectionServiceOptions) => {
  service = new SchemaSelectionService(options);
};

export const InitOtherSService = (newService: ISchemaSelectionService) => {
  service = newService;
};

export const SchemaSelectionServiceInstance = (): ISchemaSelectionService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'SchemaSelectionService needs to be initialized before using');
  }

  return service;
};

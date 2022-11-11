import type { Schema } from '../../models';
import { DataMapperApiServiceInstance } from '../services';
import type { SchemaInfoProperties } from '../services';

export const getSchemaList = (): Promise<SchemaInfoProperties[]> => {
  const service = DataMapperApiServiceInstance();

  const response = service.getSchemas();
  return response;
};

export const getSelectedSchema = (fileName: string): Promise<Schema> => {
  const service = DataMapperApiServiceInstance();

  const response = service.getSchemaFile(fileName);
  return response;
};

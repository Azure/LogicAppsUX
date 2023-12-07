import { DataMapperApiServiceInstance } from '../services';
import type { Schema } from '@microsoft/utils-logic-apps';

export const getSelectedSchema = (fileName: string, schemaFilePath: string): Promise<Schema> => {
  const service = DataMapperApiServiceInstance();

  const response = service.getSchemaFile(fileName, schemaFilePath);
  return response;
};

import { DataMapperApiServiceInstance } from '../services';
import type { DataMapSchema } from '@microsoft/logic-apps-shared';

export const getSelectedSchema = (fileName: string, schemaFilePath: string): Promise<DataMapSchema> => {
  const service = DataMapperApiServiceInstance();

  const response = service.getSchemaFile(fileName, schemaFilePath);
  return response;
};

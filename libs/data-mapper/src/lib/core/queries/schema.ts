import { DataMapperApiServiceInstance } from '../services';
import type { Schema } from '@microsoft/vscode-extension';

export const getSelectedSchema = (fileName: string, schemaFilePath: string): Promise<Schema> => {
  const service = DataMapperApiServiceInstance();

  const response = service.getSchemaFile(fileName, schemaFilePath);
  return response;
};

import type { Schema } from '../../models';
import { DataMapperApiServiceInstance } from '../services';

export const getSelectedSchema = (fileName: string): Promise<Schema> => {
  const service = DataMapperApiServiceInstance();

  const response = service.getSchemaFile(fileName);
  return response;
};

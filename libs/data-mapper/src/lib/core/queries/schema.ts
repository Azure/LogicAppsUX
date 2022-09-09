import { DataMapperApiServiceInstance } from '../services';

export const getSchemaList = () => {
  const service = DataMapperApiServiceInstance();
  const response = service.getSchemas();
  return response;
};

export const getSelectedSchema = (fileName: string) => {
  const service = DataMapperApiServiceInstance();
  const response = service.getSchemaFile(fileName);
  return response;
};

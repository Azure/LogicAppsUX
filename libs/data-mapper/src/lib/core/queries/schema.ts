import { SchemaSelectionServiceInstance } from '../services';

export const getSchemaList = () => {
  const service = SchemaSelectionServiceInstance();
  const response = service.getSchemas();
  return response;
};

export const getSelectedSchema = (fileName: string) => {
  const service = SchemaSelectionServiceInstance();
  const response = service.getSchemaFile(fileName);
  return response;
};

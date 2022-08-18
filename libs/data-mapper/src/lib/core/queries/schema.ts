import { SchemaSelectionServiceInstance } from '../services';

export const getSchemaList = () => {
  const service = SchemaSelectionServiceInstance();
  const response = service.getSchemas();
  return response;
};

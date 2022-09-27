import { DataMapperApiServiceInstance } from '../services';

export const generateDataMapXslt = (dataMapDefinition: string) => {
  const service = DataMapperApiServiceInstance();
  const response = service.generateDataMapXslt(dataMapDefinition);
  return response;
};

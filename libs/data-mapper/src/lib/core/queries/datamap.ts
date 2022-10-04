import { DataMapperApiServiceInstance } from '../services';

export const generateDataMapXslt = (dataMapDefinition: string) => {
  const service = DataMapperApiServiceInstance();
  const response = service.generateDataMapXslt(dataMapDefinition);
  return response;
};

export const testDataMap = (dataMapXsltFilename: string, schemaInputValue: string) => {
  const service = DataMapperApiServiceInstance();
  const response = service.testDataMap(dataMapXsltFilename, schemaInputValue);
  return response;
};

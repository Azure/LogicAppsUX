import { functionGroup } from './operationgroups';

const iconUri = functionGroup.properties.iconUri;
const brandColor = functionGroup.properties.brandColor;

const api = {
  id: functionGroup.id,
  name: functionGroup.name,
  displayName: functionGroup.properties.displayName,
  iconUri,
  brandColor,
  description: functionGroup.properties.description,
};

export const functionOperation = {
  id: 'azureFunction',
  name: 'azureFunction',
  type: 'azureFunction',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure function',
    description: 'Show Azure Functions in my subscription',
    visibility: 'Important',
    operationType: 'function',
    brandColor,
    iconUri,
  },
};

export const swaggerFunctionOperation = {
  id: 'azureSwaggerFunction',
  name: 'azureSwaggerFunction',
  type: 'azureFunction',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure swagger function',
    description: 'Show Azure Swagger Functions in my subscription',
    visibility: 'Important',
    operationType: 'function',
    brandColor,
    iconUri,
  },
};

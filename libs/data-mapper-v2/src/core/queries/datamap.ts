import { DataMapperApiServiceInstance } from '../services';
import { XsltDefinitionDeserializer } from '../../mapHandling/XsltDefinitionDeserializer';
import { convertToXsltDefinition } from '../../mapHandling/XsltDefinitionSerializer';
import type { FunctionData } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import type { SchemaExtended } from '@microsoft/logic-apps-shared';

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

export const convertXsltToConnections = (
  xsltContent: string,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  functions: FunctionData[]
): ConnectionDictionary => {
  const xsltDeserializer = new XsltDefinitionDeserializer(xsltContent, sourceSchema, targetSchema, functions);
  return xsltDeserializer.convertFromXsltDefinition();
};

export const convertConnectionsToXslt = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): string => {
  const result = convertToXsltDefinition(connections, sourceSchema, targetSchema);
  if (result.isSuccess) {
    return result.definition;
  }
  throw new Error(`Failed to convert connections to XSLT: ${result.errorNodes.length} errors`);
};

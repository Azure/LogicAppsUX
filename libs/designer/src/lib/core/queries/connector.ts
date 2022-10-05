import { getReactQueryClient } from '../ReactQueryProvider';
import type { ListDynamicValue } from '@microsoft-logic-apps/designer-client-services';
import { ConnectorService } from '@microsoft-logic-apps/designer-client-services';
import type { LegacyDynamicSchemaExtension, LegacyDynamicValuesExtension } from '@microsoft-logic-apps/parsers';

export const getLegacyDynamicValues = async (
  connectionId: string,
  connectorId: string,
  parameters: Record<string, any>,
  extension: LegacyDynamicValuesExtension,
  parameterArrayType: string,
  isManagedIdentityTypeConnection?: boolean,
  data?: any
): Promise<ListDynamicValue[]> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  return queryClient.fetchQuery(
    [
      'legacydynamicValues',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      extension.operationId?.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
    ],
    () =>
      service.getLegacyDynamicValues(
        connectionId,
        connectorId,
        parameters,
        extension,
        parameterArrayType,
        isManagedIdentityTypeConnection,
        data
      )
  );
};
export const getListDynamicValues = async (
  connectionId: string,
  connectorId: string,
  operationId: string,
  parameterAlias: string | undefined,
  parameters: Record<string, any>,
  dynamicState: any
): Promise<ListDynamicValue[]> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  return queryClient.fetchQuery(
    [
      'listdynamicvalues',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      operationId.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
    ],
    () => service.getListDynamicValues(connectionId, connectorId, operationId, parameterAlias, parameters, dynamicState)
  );
};

export const getLegacyDynamicSchema = async (
  connectionId: string,
  connectorId: string,
  parameters: Record<string, any>,
  extension: LegacyDynamicSchemaExtension,
  isManagedIdentityTypeConnection?: boolean,
  data?: any
): Promise<OpenAPIV2.SchemaObject | null> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  return queryClient.fetchQuery(
    [
      'legacydynamicschema',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      extension.operationId?.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
    ],
    () => service.getLegacyDynamicSchema(connectionId, connectorId, parameters, extension, isManagedIdentityTypeConnection, data)
  );
};

export const getDynamicSchemaProperties = async (
  connectionId: string,
  connectorId: string,
  operationId: string,
  parameterAlias: string | undefined,
  parameters: Record<string, any>,
  dynamicState: any
): Promise<OpenAPIV2.SchemaObject> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  return queryClient.fetchQuery(
    [
      'dynamicschemaproperties',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      operationId.toLowerCase(),
      getParametersKey(parameters),
    ],
    () => service.getDynamicSchema(connectionId, connectorId, operationId, parameterAlias, parameters, dynamicState)
  );
};

const getParametersKey = (parameters: Record<string, any>): string => {
  return Object.keys(parameters).reduce(
    (result: string, parameterKey: string) => `${result}, ${parameterKey}-${parameters[parameterKey]}`,
    ''
  );
};

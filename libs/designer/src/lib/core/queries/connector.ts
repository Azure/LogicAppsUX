import { getReactQueryClient } from '../ReactQueryProvider';
import type { ListDynamicValue } from '@microsoft-logic-apps/designer-client-services';
import { ConnectorService } from '@microsoft-logic-apps/designer-client-services';

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
    ['listdynamicvalues', { connectionId }, { connectorId }, { operationId }, { parameter: getParametersKey(parameters) }],
    () => service.getListDynamicValues(connectionId, connectorId, operationId, parameterAlias, parameters, dynamicState)
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
    ['dynamicschemaproperties', { connectionId }, { connectorId }, { operationId }, { parameter: getParametersKey(parameters) }],
    () => service.getDynamicSchema(connectionId, connectorId, operationId, parameterAlias, parameters, dynamicState)
  );
};

const getParametersKey = (parameters: Record<string, any>): string => {
  return Object.keys(parameters).reduce(
    (result: string, parameterKey: string) => `${result}, ${parameterKey}-${parameters[parameterKey]}`,
    ''
  );
};

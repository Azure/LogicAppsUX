import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

export interface ListDynamicValue {
  value: any;
  displayName: string;
  description?: string;
  disabled?: boolean;
}

export interface IConnectorService {
  /**
   * Gets the item dynamic values.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic values must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter id.
   * @arg {any} dynamicState - Dynamic state required for invocation.
   * @return {Promise<ListDynamicValue[]>}
   */
  getListDynamicValues(
    connectionId: string,
    connectorId: string,
    operationId: string,
    parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<ListDynamicValue[]>;

  /**
   * Gets the dynamic schema for a parameter.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic schema must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter id.
   * @arg {any} dynamicState - Dynamic state required for invocation.
   * @return {Promise<Swagger.Schema>}
   */
  getDynamicSchema(
    connectionId: string,
    connectorId: string,
    operationId: string,
    parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject>;
}

let service: IConnectorService;

export const InitConnectorService = (connectorService: IConnectorService): void => {
  service = connectorService;
};

export const ConnectorService = (): IConnectorService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConnectorService need to be initialized before using');
  }

  return service;
};

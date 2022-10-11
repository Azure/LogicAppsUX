import type { LegacyDynamicSchemaExtension, LegacyDynamicValuesExtension } from '@microsoft-logic-apps/parsers';
import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

export interface ListDynamicValue {
  value: any;
  displayName: string;
  description?: string;
  disabled?: boolean;
}

export interface ManagedIdentityRequestProperties {
  connection: {
    id: string;
  };
  connectionRuntimeUrl: string;
  connectionProperties: Record<string, any>;
  authentication: {
    type: string;
    identity?: string;
  };
}

export interface IConnectorService {
  /**
   * Gets the item dynamic values for azure operations.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
   * @arg {LegacyDynamicValuesExtension} extension - Dynamic value extension.
   * @arg {string} parameterArrayType - Dynamic values parameter collection array type.
   * @arg {boolean} isManagedIdentityTypeConnection - If connection is a managed identity connection.
   * @arg {ManagedIdentityRequestProperties} managedIdentityProperties - Data to be sent in request payload for managed identity connections.
   * @return {Promise<ListDynamicValue[]>}
   */
  getLegacyDynamicValues(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    extension: LegacyDynamicValuesExtension,
    parameterArrayType: string,
    isManagedIdentityTypeConnection?: boolean,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<ListDynamicValue[]>;

  /**
   * Gets the item dynamic values for manifest based operations.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic values must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
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
   * Gets the dynamic schema for a parameter in azure operations.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
   * @arg {LegacyDynamicSchemaExtension} extension - Dynamic schema extension.
   * @arg {boolean} isManagedIdentityTypeConnection - If connection is a managed identity connection.
   * @arg {ManagedIdentityRequestProperties} managedIdentityProperties - Data to be sent in request payload for managed identity connections.
   * @return {Promise<OpenAPIV2.SchemaObject | null>}
   */
  getLegacyDynamicSchema(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    extension: LegacyDynamicSchemaExtension,
    isManagedIdentityTypeConnection?: boolean,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<OpenAPIV2.SchemaObject | null>;

  /**
   * Gets the dynamic schema for a parameter in manifest based operations.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic schema must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
   * @arg {any} dynamicState - Dynamic state required for invocation.
   * @return {Promise<OpenAPIV2.SchemaObject>}
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

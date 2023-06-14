import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface ListDynamicValue {
  value: any;
  displayName: string;
  description?: string;
  disabled?: boolean;
}

export interface TreeDynamicValue {
  value: any;
  displayName: string;
  isParent: boolean;
  mediaType?: string;
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
   * Gets the dynamic content for values/schema/tree items for azure operations backed by swagger.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
   * @arg {ManagedIdentityRequestProperties} managedIdentityProperties - Data to be sent in request payload for managed identity connections.
   * @return {Promise<any>}
   */
  getLegacyDynamicContent(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any>;

  /**
   * Gets the item dynamic values for manifest based operations.
   * @arg {string | undefined} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic values must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
   * @arg {any} dynamicState - Dynamic state required for invocation.
   * @return {Promise<ListDynamicValue[]>}
   */
  getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<ListDynamicValue[]>;

  /**
   * Gets the dynamic schema for a parameter in manifest based operations.
   * @arg {string | undefined} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic schema must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
   * @arg {any} dynamicState - Dynamic state required for invocation.
   * @return {Promise<OpenAPIV2.SchemaObject>}
   */
  getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject>;

  /**
   * Gets the tree dynamic values.
   * @arg {string} connectionId - The connection id.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id for the parameter whose dynamic values must be fetched.
   * @arg {string} parameterAlias - The parameter alias for the parameter whose dynamic values must be fetched.
   * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter id.
   * @arg {any} dynamicState - Dynamic state required for invocation.
   * @return {Promise<TreeDynamicValue[]>}
   */
  getTreeDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<TreeDynamicValue[]>;
}

let service: IConnectorService;

export const InitConnectorService = (connectorService: IConnectorService): void => {
  service = connectorService;
};

export const ConnectorService = (): IConnectorService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConnectorService needs to be initialized before using');
  }

  return service;
};

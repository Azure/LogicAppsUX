import type { OpenAPIV2, OperationInfo, OperationManifest } from '../../utils/src';
import { AssertionException, AssertionErrorCode } from '../../utils/src';

/**
 * The operation manifest service.
 */
export interface IOperationManifestService {
  /**
   * Checks if the operation type is supported.
   * @arg [string] operationType - The operation type.
   * @arg [string] operationKind - The operation kind.
   * @return {boolean}
   */
  isSupported(operationType?: string, operationKind?: string): boolean;

  /**
   * Checks if the operation type has aliasing supported.
   * @arg [string] operationType - The operation type.
   * @arg [string] operationKind - The operation kind.
   * @return {boolean}
   */
  isAliasingSupported(operationType?: string, operationKind?: string): boolean;

  /**
   * Gets the operation info.
   * @arg {any} definition - The operation definition.
   * @arg {boolean} isTrigger - Flag to determine if the definition is of a trigger operation.
   * @return {Promise<OperationInfo>}
   */
  getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo>;

  /**
   * Gets the operation manifest for an operation.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @return {Promise<any>}
   */
  getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest>;

  /**
   * Gets the transformed output property body items with aliases
   * @arg {OpenAPIV2.SchemaObject | undefined} schemaItem - The output property body items.
   * @return {OpenAPIV2.SchemaObject | undefined}
   */
  getUpdatedOutputsForSplitOn?(schemaItem: OpenAPIV2.SchemaObject | undefined): OpenAPIV2.SchemaObject | undefined;
}

let service: IOperationManifestService;

export const InitOperationManifestService = (manifestService: IOperationManifestService): void => {
  service = manifestService;
};

export const OperationManifestService = (): IOperationManifestService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'OperationManifestService needs to be initialized before using'
    );
  }

  return service;
};

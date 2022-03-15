interface OperationInfo {
    connectorId: string;
    operationId: string;
}

/**
 * The operation manifest service.
 */
export interface OperationManifestService {
    /**
     * Checks if the operation type is supported.
     * @arg {string} operationType - The operation type.
     * @arg {string | undefined} operationKind - The operation kind.
     * @return {boolean}
     */
    isSupported(operationType: string, operationKind: string | undefined): boolean;

    /**
     * Gets the operation info.
     * @arg {any} definition - The operation definition.
     * @return {Promise<OperationInfo>}
     */
    getOperationInfo(definition: any): Promise<OperationInfo>; // tslint:disable-line: no-any

    /**
     * Gets the operation manifest for an operation.
     * @arg {string} connectorId - The connector id.
     * @arg {string} operationId - The operation id.
     * @return {Promise<any>}
     */
    getOperationManifest(connectorId: string, operationId: string): Promise<any>;
}

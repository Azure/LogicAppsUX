import { AssertionErrorCode, AssertionException } from "@microsoft/logic-apps-shared";

export interface IDataMapperFileService {

// eventually will need these

// saveXsltCall,
// saveDraftStateCall,
// addSchemaFromFile,
// readCurrentCustomXsltPathOptions,
    /**
     * Saves both the data map definition and metadata to the filesystem.
     * @arg {string} dataMapDefinition - The map definition as a string.
     * @arg {string} mapMetadata - Map metadata to be saved, as a string.
     * @return {Promise<any>}
     */
    saveMapDefinitionCall(
      dataMapDefinition: string,
    mapMetadata: string
    ): void;
  
    // danielle fix these later
    /**
     * Gets all schemas from the filesystem from the Schemas folder.
     * @arg {string | undefined} connectionId - The connection id.
     * @arg {string} connectorId - The connector id.
     * @arg {string} operationId - The operation id.
     * @arg {Record<string, any>} parameters - The operation parameters. Keyed by parameter name.
     * @arg {any} dynamicState - Dynamic state required for invocation.
     * @arg {boolean} [isManagedIdentityConnection] - Indicates if the connection is MSI based.
     * @return {Promise<ListDynamicValue[]>}
     */
    readCurrentSchemaOptions( ): void;
  
  }
  
  let service: IDataMapperFileService;
  
  export const InitDataMapperFileService = (dataMapperFileService: IDataMapperFileService): void => {
    service = dataMapperFileService;
  };
  
  export const DataMapperFileService = (): IDataMapperFileService => {
    if (!service) {
      throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'DataMapperFileService needs to be initialized before using');
    }
  
    return service;
  };
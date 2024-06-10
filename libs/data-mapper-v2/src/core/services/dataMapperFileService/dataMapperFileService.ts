import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

export interface IDataMapperFileService {
  // these need to be added later
  // saveXsltCall,
  // saveDraftStateCall,
  // addSchemaFromFile,
  // readCurrentCustomXsltPathOptions,

  /**
   * Saves both the data map definition and metadata to the filesystem.
   * @arg {string} dataMapDefinition - The map definition as a string.
   * @arg {string} mapMetadata - Map metadata to be saved, as a string.
   * @return {null} we get the output from the store
   */
  saveMapDefinitionCall(dataMapDefinition: string, mapMetadata: string): void;

  /**
   * Gets all schemas from the filesystem from the Schemas folder.
   * @return {null} we get the output from the store
   */
  readCurrentSchemaOptions(): void;
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

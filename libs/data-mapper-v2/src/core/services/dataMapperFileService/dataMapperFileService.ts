import type { SchemaType } from '@microsoft/logic-apps-shared';
import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

export interface SchemaFile {
  path: string;
  type: SchemaType;
}

export interface IDataMapperFileService {
  // these need to be added later

  // addSchemaFromFile,

  /**
   * Saves both the data map definition and metadata to the filesystem.
   * @arg {string} dataMapDefinition - The map definition as a string.
   * @arg {string} mapMetadata - Map metadata to be saved, as a string.
   * @return {null} we get the output from the store
   */
  saveMapDefinitionCall(dataMapDefinition: string, mapMetadata: string): void;

  /**
   * Saves the data map draft to the filesystem.
   * @arg {string} dataMapDefinition - The map definition as a string.
   * @return {null} we get the output from the store
   */
  saveDraftStateCall(dataMapDefinition: string): void;

  /**
   * Gets all schemas from the filesystem from the Schemas folder.
   * @return {null} we get the output from the store
   */
  readCurrentSchemaOptions(): void;

  /**
   * Saves the XSLT to the filesystem.
   * @arg {string} xslt - The map XLST as a string.
   * @return {null}
   */
  saveXsltCall(xslt: string): void;

  /**
   * Gets custom XSLT paths from the filesystem.
   * @arg {string} xslt - The map XLST as a string.
   * @return {null}
   */
  readCurrentCustomXsltPathOptions(): void;

  /**
   * Adds a schema from a file to the data mapper.
   */
  addSchemaFromFile(selectedSchemaFile: SchemaFile): void;
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

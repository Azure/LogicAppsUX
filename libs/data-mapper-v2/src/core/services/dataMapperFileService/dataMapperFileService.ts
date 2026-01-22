import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';
import type { SchemaType } from '@microsoft/logic-apps-shared';

export interface SchemaFile {
  path: string;
  type: SchemaType;
}

export interface IDataMapperFileService {
  /**
   * Opens dialog in VSCode to select a file.
   * @arg {SchemaType} schemaType - used so that we know which schema to use as Source/Target when file path is returned.
   */
  getSchemaFromFile(schemaType: SchemaType): void;

  /**
   * @deprecated Use saveMapXsltCall instead. This method is kept for backward compatibility during migration.
   * Saves both the data map definition and metadata to the filesystem.
   * @arg {string} dataMapDefinition - The map definition as a string.
   * @arg {string} mapMetadata - Map metadata to be saved, as a string.
   * @return {null} we get the output from the store
   */
  saveMapDefinitionCall?(dataMapDefinition: string, mapMetadata: string): void;

  /**
   * Saves the data map XSLT with embedded metadata to the filesystem.
   * This is the primary save method - the XSLT contains all mapping information.
   * @arg {string} xsltWithMetadata - The XSLT content with embedded metadata comment.
   * @return {null}
   */
  saveMapXsltCall(xsltWithMetadata: string): void;

  /**
   * Saves the data map draft XSLT to the filesystem.
   * @arg {string} xsltWithMetadata - The draft XSLT content with embedded metadata.
   * @return {null} we get the output from the store
   */
  saveDraftStateCall(xsltWithMetadata: string): void;

  /**
   * Gets all schemas from the filesystem from the Schemas folder.
   * @return {null} we get the output from the store
   */
  readCurrentSchemaOptions(): void;

  /**
   * @deprecated Use saveMapXsltCall instead. Kept for backward compatibility.
   * Saves the XSLT to the filesystem.
   * @arg {string} xslt - The map XLST as a string.
   * @return {null}
   */
  saveXsltCall?(xslt: string): void;

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

  sendNotification(title: string, text: string, level: number): void;

  isTestDisabledForOS(): void;

  /**
   * Triggers an XSLT transformation test locally via the extension host.
   * The result will be sent back via the testXsltTransformResult command.
   * @arg {string} xsltContent - The XSLT content to transform with.
   * @arg {string} inputXml - The input XML to transform.
   */
  testXsltTransform(xsltContent: string, inputXml: string): void;
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

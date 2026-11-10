export const lmlEditorViewType = 'biztalkDataMapper.lmlEditor';

export type LmlEditorMethod =
  | 'initialize'
  | 'getFunctionsManifest'
  | 'getSchemaFile'
  | 'generateDataMapXslt'
  | 'testDataMap'
  | 'saveMapDefinition'
  | 'saveDraftState'
  | 'saveXslt'
  | 'readSchemas'
  | 'selectSchema'
  | 'readCustomXsltPaths'
  | 'getPublishContext'
  | 'selectAzurePublishTarget'
  | 'listAzurePublishResources'
  | 'publishMap'
  | 'notify';

export interface LmlEditorRequest {
  type: 'lmlRequest';
  id: string;
  method: LmlEditorMethod;
  params?: Record<string, unknown>;
}

export interface LmlEditorResponse {
  type: 'lmlResponse';
  id: string;
  result?: unknown;
  error?: string;
}

export interface LmlEditorInitialState {
  mapText: string;
  metadataText?: string;
  xsltFilename: string;
  xsltContent: string;
  schemaPaths: string[];
  customXsltPaths: string[];
  isTestDisabledForOS: boolean;
  isDark: boolean;
  revision: number;
}

export interface LmlEditorDocumentChange {
  type: 'lmlDocumentChanged';
  revision: number;
}

export interface LmlSaveRequested {
  type: 'lmlSaveRequested';
  id: string;
  revision: number;
  mapText: string;
}

export interface LmlSaveSnapshot {
  type: 'lmlSaveSnapshot';
  id: string;
  revision: number;
  dataMapDefinition: string;
  mapMetadata?: string;
  error?: string;
}

export interface LmlDocumentSaved {
  type: 'lmlDocumentSaved';
  id: string;
  revision: number;
}

export interface LmlEditorCommand {
  type: 'lmlCommand';
  command: 'compile' | 'test';
}

import type { Connector } from './connector';

export interface UploadChunkMetadata {
  chunkTransferSupported?: boolean;
  acceptUploadSize?: boolean;
  minimumSize?: number;
  maximumSize?: number;
}

export interface DownloadChunkMetadata {
  acceptDownloadSize?: boolean;
  minimumSize?: number;
  maximumSize?: number;
}

export interface OperationInfo {
  connectorId: string;
  operationId: string;
}

export interface SecureDataOptions {
  outputsMode?: OutputSecureDataMode;
}

export enum OutputSecureDataMode {
  Disabled = 'disabled',
  LinkedToInputs = 'linkedtoinputs',
}

export enum SettingScope {
  Trigger = 'trigger',
  Action = 'action',
}

export enum ExecutionOrder {
  Parallel = 'parallel',
  Sequential = 'sequential',
}

export enum OperationOptions {
  Asynchronous = 'Asynchronous',
  DisableAsyncPattern = 'DisableAsyncPattern',
  DisableAutomaticDecompression = 'DisableAutomaticDecompression',
  EnableSchemaValidation = 'EnableSchemaValidation',
  SuppressWorkflowHeaders = 'SuppressWorkflowHeaders',
  SuppressWorkflowHeadersOnResponse = 'SuppressWorkflowHeadersOnResponse',
}

export enum ConnectionType {
  Function = 'function',
  ServiceProvider = 'serviceprovider',
}

export enum ConnectionReferenceKeyFormat {
  Function = 'function',
  OpenApi = 'openapi',
  ServiceProvider = 'serviceprovider',
}

export interface ActionSetting {
  allowedOperations?: OperationInfo[];
  executionOrder?: ExecutionOrder;
  allowedSettings?: string[];
  isOptional: boolean;
}

export type SplitOn = string | any[] | undefined;

export interface OperationManifestSetting<T> {
  scopes?: SettingScope[]; // NOTE: If the scopes set to undefined, then the options apply to all scopes.
  options?: T;
}

// TODO: Combine chunking and download chunking.
export interface OperationManifestSettings {
  chunking?: OperationManifestSetting<UploadChunkMetadata>;
  concurrency?: OperationManifestSetting<void>;
  correlation?: OperationManifestSetting<void>;
  downloadChunking?: OperationManifestSetting<DownloadChunkMetadata>;
  operationOptions?: OperationManifestSetting<OperationOptions[]>;
  paging?: OperationManifestSetting<void>;
  requestOptions?: OperationManifestSetting<void>;
  retryPolicy?: OperationManifestSetting<void>;
  secureData?: OperationManifestSetting<SecureDataOptions>;
  timeout?: OperationManifestSetting<void>;
  trackedProperties?: OperationManifestSetting<void>;
}

export interface Badge {
  name: string;
  description: string;
}

export interface RepetitionInfo {
  self?: {
    parametersToExclude?: string[];
  };
  loopParameter?: string;
}

export interface BuiltInOutput {
  name: string;
  title: string;
  type: string;
  required: boolean;
}

export enum RecurrenceType {
  None = 'none',
  Basic = 'basic',
  Advanced = 'advanced',
}

export interface RecurrenceSetting {
  type: RecurrenceType;
  useLegacyParameterGroup?: boolean;
}

export interface ConnectionMetadata {
  required: boolean;
  type?: ConnectionType;
}

export interface ConnectionReferenceKeyFormatMapping {
  referenceKeyFormat: ConnectionReferenceKeyFormat;
}

export interface Documentation {
  url: string;
}

export interface SubGraphDetail {
  location?: string[];
  inputs?: SwaggerSchema;
  inputsLocation?: string[];
  isAdditive?: boolean;
}

type SwaggerSchema = any;
export interface OperationManifest {
  properties: OperationManifestProperties;
}

export interface OperationManifestProperties {
  iconUri: string;
  brandColor: string;
  description?: string;
  summary?: string;

  allowChildOperations?: boolean;
  childOperationsLocation?: string[];

  subGraphDetails?: Record<string, SubGraphDetail>;

  statusBadge?: Badge;
  environmentBadge?: Badge;

  outputTokens?: {
    selfReference?: boolean;
    builtIns: BuiltInOutput[];
  };

  repetition?: RepetitionInfo;

  recurrence?: RecurrenceSetting;

  inputs?: SwaggerSchema;
  inputsLocation?: string[]; // NOTE(tonytang): If not specified, default value is [ 'inputs' ]
  isInputsOptional?: boolean;

  outputs?: SwaggerSchema;
  /*
   * NOTE(trbaratc): Output resolution takes place as follows. If no payload outputs are present, then use outputs.
   * If payload outputs are present then walk the path defined by alternativeOutputs.keyPath to find the outputsKey. If the outputsKey is not defined, use outputs.
   * If outputsKey is defined and specifically present inside of alternativeOutputs.schemas, use the corresponding schema from alternativeOutputs.schemas.
   * Else, if outputsKey is defined but not specifically considered, use alternativeOutputs.defaultSchema.
   */
  alternativeOutputs?: {
    keyPath: string[];
    defaultSchema: SwaggerSchema;
    schemas: Record<string, SwaggerSchema>;
  };
  isOutputsOptional?: boolean;

  settings?: OperationManifestSettings;

  trigger?: string;
  triggerHint?: string;
  connector?: Connector;
  autoCast?: boolean;
  includeRootOutputs?: boolean;

  actions?: ActionSetting[];

  connection?: ConnectionMetadata;
  connectionReference?: ConnectionReferenceKeyFormatMapping;

  externalDocs?: Documentation;
}

export type SubgraphType = 'CONDITIONAL_TRUE' | 'CONDITIONAL_FALSE' | 'SWITCH_CASE' | 'SWITCH_DEFAULT' | 'SWITCH_ADD_CASE' | 'UNTIL_DO';
export const SUBGRAPH_TYPES: Record<string, SubgraphType> = {
  CONDITIONAL_TRUE: 'CONDITIONAL_TRUE',
  CONDITIONAL_FALSE: 'CONDITIONAL_FALSE',
  SWITCH_CASE: 'SWITCH_CASE',
  SWITCH_DEFAULT: 'SWITCH_DEFAULT',
  SWITCH_ADD_CASE: 'SWITCH_ADD_CASE',
  UNTIL_DO: 'UNTIL_DO',
};

import type { Badge } from './operationmanifest';

// type TriggerTypes = 'batch' | 'single';
// type VisibilityTypes = 'important' | 'Important' | 'advanced';

export interface OperationApi {
  brandColor?: string;
  description?: string;
  displayName: string;
  iconUri: string;
  id: string;
  location?: string;
  name?: string;
  tier?: string;
  type?: string;
  externalDocs?: ExternalDocs;
}

export interface ExternalDocs {
  url: string;
}

export interface SomeKindOfAzureOperationDiscovery {
  annotation?: {
    status: string;
    family?: string;
    revision?: number;
  };
  isNotification?: boolean;
  api: OperationApi;
  description: string;
  operationType?: string;
  operationKind?: string;
  summary: string;
  swaggerOperationId?: string;
  environmentBadge?: Badge;
  isChunkingSupported?: boolean;
  pageable: boolean;
  isWebhook: boolean;
  // infoMessage?: InfoMessage;
  externalDocs: ExternalDocs;
  // swaggerExternalDocs?: Swagger.ExternalDocumentation;
  trigger?: string;
  triggerHint?: string;
  visibility?: string;
  // _overrideDefaultDynamicParameterTypes?: Set<DynamicallyAddedParameterType>;
}

export interface BuiltInOperation {
  annotation?: {
    status: string;
  };
  api: OperationApi;
  description: string;
  operationType: 'serviceProvider' | string;
  operationKind?: string;
  summary: string;
  brandColor: string;
  visibility: string;
  iconUri: string;
}

export interface DiscoveryOperation<TData extends DiscoveryResultTypes> {
  properties: TData;
  location?: string;
  description?: string;
  icon?: string;
  id: string;
  kind?: string;
  name: string;
  type: string;
}

export type DiscoveryResultTypes = SomeKindOfAzureOperationDiscovery | BuiltInOperation;

// export type RecommendationDataType =
//     | ApiManagementApi
//     | ApiManagementServiceResource
//     | SwaggerOperation
//     | ApiOperationProperties
//     | FunctionProperties
//     | WebsiteProperties
//     | WorkflowProperties;

export interface Operation {
  brandColor: string;
  connector: string;
  connectorKind?: string;
  description: string;

  //documentation?: OpenAPIV2.ExternalDocumentationObject;

  environmentBadge?: {
    name: string;
    description: string;
  };
  //externalDocs?: OpenAPIV2.ExternalDocumentationObject;
  iconUri: string;
  id: string;
  important?: boolean;
  operationType?: string;
  premium?: boolean;
  preview?: boolean;
  promotionIndex?: number;
  subtitle?: string;
  title: string;
}

type TriggerTypes = 'batch' | 'single';
type VisibilityTypes = 'important' | 'advanced';

export interface OperationSearchResult {
  properties: {
    category: 'Azure' | 'Built-in';
    summary: string;
    description: string;
    visibility?: VisibilityTypes;
    trigger: TriggerTypes;
    triggerHint?: string;
    pageable: boolean;
    isChunkingSupported: boolean;
    annotation: { status: string; family: string; revision: number };
    api: {
      name: string;
      displayName: string;
      description: string;
      iconUri: string;
      brandColor: string;
      category: 'Standard';
      id: string;
      type: string;
    };
    isWebhook: boolean;
    isNotification: boolean;
    externalDocs: { url: string };
  };
  id: string;
  name: string;
  type: string;
  location: string;
}

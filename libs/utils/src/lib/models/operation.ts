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
type VisibilityTypes = 'important' | 'Important' | 'advanced';

export interface OperationDiscoveryResult {
  // danielle move over types from bpmux
  properties: {
    category: 'Azure' | 'Built-in'; // danielle added this for demo purposes
    summary: string;
    description: string;
    visibility?: VisibilityTypes;
    operationType?: string;
    trigger?: TriggerTypes;
    triggerHint?: string;
    pageable?: boolean;
    isChunkingSupported?: boolean;
    annotation: { status: string; family: string; revision: number };
    api: {
      name: string;
      displayName: string;
      description: string;
      iconUri: string;
      brandColor: string;
      category?: 'Standard';
      id: string;
      type: string;
    };
    isWebhook: boolean;
    isNotification: boolean;
    externalDocs: { url: string };
    brandColor?: string;
    iconUri?: string;
  };
  id: string;
  name: string;
  type: string;
  location: string;
}

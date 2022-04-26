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

export interface Operation {
  brandColor: string;
  connector?: string;
  connectorKind?: string;
  description: string;

  //documentation?: Swagger.ExternalDocumentation;

  environmentBadge?: {
    name: string;
    description: string;
  };
  //externalDocs?: Swagger.ExternalDocumentation;
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

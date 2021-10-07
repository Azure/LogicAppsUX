import { ICalloutProps } from '@fluentui/react';

export interface OperationKind {
  itemKey: string;
  linkText: string;
}

export enum Categories {
  FORYOU = 'FOR_YOU',
  MODULES = 'MODULES',
}

export enum ShowMode {
  Both,
  Connectors,
  Operations,
}

export interface Connector {
  brandColor: string;
  icon: string;
  id: string;
  environmentBadge?: {
    name: string;
    description: string;
  };
  promotionIndex?: number;
  category?: string;
  title: string;
}

export interface DisableableConnector extends Connector {
  disabled: boolean;
}

export interface DisableableModule extends Module {
  disabled: boolean;
}

export interface DisableableOperation extends Operation {
  disabled: boolean;
}

export interface SuggestedItem {
  connector: Connector;
  operations: Operation[];
}

export interface Module {
  description: string;
  id: string;
  image: string;
  title: string;
}

export interface Operation {
  brandColor: string;
  connector?: string;
  connectorKind?: string;
  description: string;

  /**
   * @deprecated Use externalDocs instead.
   */
  documentation?: Swagger.ExternalDocumentation;

  environmentBadge?: {
    name: string;
    description: string;
  };
  externalDocs?: Swagger.ExternalDocumentation;
  icon: string;
  id: string;
  important?: boolean;
  operationType?: string;
  premium?: boolean;
  preview?: boolean;
  promotionIndex?: number;
  subtitle: string;
  title: string;
}

export interface RecommendationState {
  moduleCalloutProps: ICalloutProps;
  operationCalloutProps: ICalloutProps;
}

export interface RenderOperationDescriptionResponse {
  documentation?: Swagger.ExternalDocumentation;
}

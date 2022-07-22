import type { ArmResource } from './armresource';
import type { Badge } from './operationmanifest';

export enum Capabilities {
  blob,
  composite,
  tabular,
  gateway,
  cloud,
  vnetgateway,
}

export enum ConnectionParameterTypes {
  array,
  bool,
  connection,
  gatewaySetting,
  int,
  managedIdentity,
  oauthSetting,
  object,
  secureObject,
  secureString,
  string,
}

export interface ConnectionParameterAllowedValue {
  text?: string;
  value: any;
}

export type LiteralBoolean = 'true' | 'false';

export interface ConnectionParameterUIDefinition extends ConnectionParameterUIDefinitionBase {
  description?: string;
  displayName?: string;
  schema?: ParameterSchema;
}

export interface ParameterSchema {
  type?: string;
  format?: string;
  description?: string;
  'x-ms-editor'?: string;
  'x-ms-editor-options'?: any;
}

export interface ConnectionParameterSetParameterUIDefinition extends ConnectionParameterUIDefinitionBase {
  description: string;
  displayName: string;
  schema?: ParameterSchema;
}

export interface ConnectionParameterUIDefinitionBase {
  constraints?: {
    dependentCapability?: string;

    /**
     * @member {'true' | 'false'} [required='false'] - 'true' if the parameter's value is required.
     */
    required?: LiteralBoolean;

    allowedValues?: ConnectionParameterAllowedValue[];
    capability?: string[];
    tabIndex?: number;
    clearText?: boolean;
    /**
     * @member {'true' | 'false'} [required='false'] - 'true' if the parameter's value is hidden and should be hidden/ignored from UI and connection creation payload.
     */
    hidden?: LiteralBoolean;
    location?: string;
    propertyPath?: string[];
    hideInUI?: string;
    default?: any;
    dependentParameter?: {
      parameter: string;
      value: any;
    };
    requiresConnectionNamePrefix?: string;
  };
  tooltip?: string;
}

export interface ConnectionParameterSetUIDefinition {
  description: string;
  displayName: string;
}

export interface OAuthSettingProperties {
  AzureActiveDirectoryResourceId?: string;
  IsFirstParty: string;
}

export interface OAuthSetting {
  clientId: string;
  identityProvider: string;
  redirectUrl: string;
  scopes: string[];
  properties: OAuthSettingProperties;
}

export interface ManagedIdentitySetting {
  resourceUri: string;
}

export interface GatewaySetting {
  dataSourceType?: string;
  connectionDetails?: string[];
}

export type ConnectionAlternativeParameters = Record<string, ConnectionParameter>;

export interface ConnectionParameterMetadata {
  sourceType?: string;
}

export enum ConnectionParameterSource {
  AppConfiguration = 'AppConfiguration',
}

export interface ConnectionParameter {
  type: string;
  metadata?: ConnectionParameterMetadata;
  uiDefinition?: ConnectionParameterUIDefinition;
  managedIdentitySettings?: ManagedIdentitySetting;
  oAuthSettings?: OAuthSetting;
  gateway?: GatewaySetting;
  parameterSource?: ConnectionParameterSource;
}

export enum ConnectionParameterSchemaType {
  string = 'string',
}

export enum ConnectionParameterSchemaFormat {
  azureAdTenantId = 'azureadtenantid',
}

export interface ConnectionParameterSetParameter {
  type: string;
  uiDefinition: ConnectionParameterSetParameterUIDefinition;
  managedIdentitySettings?: ManagedIdentitySetting;
  oAuthSettings?: OAuthSetting;
  gateway?: GatewaySetting;
}

export interface ConnectionParameterSet {
  name: string;
  uiDefinition: ConnectionParameterSetUIDefinition;
  parameters: Record<string, ConnectionParameterSetParameter>;
}

export interface ConnectionParameterSets {
  uiDefinition: ConnectionParameterSetUIDefinition;
  values: ConnectionParameterSet[];
}

export interface ConnectorProperty {
  capabilities: string[];
  connectionDisplayName?: string;
  displayName: string;
  environmentBadge?: Badge;
  environment?: string;
  purpose?: string;
  iconUri: string;
  runtimeUrls?: string[];
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSets?: ConnectionParameterSets;
  connectionAlternativeParameters?: ConnectionAlternativeParameters;
  swagger?: any;
  [property: string]: any;
  wadlUrl?: string;
  brandColor?: string;
  termsOfUseUrl?: string;
  metadata?: {
    brandColor?: string;
    source?: string;
    connectionType?: string;
  };
  scopes?: {
    will?: string[];
    wont?: string[];
  };
  generalInformation?: {
    displayName?: string;
    iconUrl?: string;
    description?: string;
  };
  integrationServiceEnvironment?: {
    id: string;
  };

  isCustomApi?: boolean;
}

export type Connector = ArmResource<ConnectorProperty>;

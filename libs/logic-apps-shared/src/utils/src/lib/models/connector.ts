import type { ArmResource } from './armresource';
import type { Badge } from './operationmanifest';

export const Capabilities = {
  blob: 'blob',
  composite: 'composite',
  tabular: 'tabular',
  gateway: 'gateway',
  cloud: 'cloud',
  vnetgateway: 'vnetgateway',
  general: 'general',
} as const;
export type Capabilities = (typeof Capabilities)[keyof typeof Capabilities];

export const ConnectionParameterTypes = {
  array: 'array',
  bool: 'bool',
  connection: 'connection',
  gatewaySetting: 'gatewaySetting',
  int: 'int',
  managedIdentity: 'managedIdentity',
  oauthSetting: 'oauthSetting',
  object: 'object',
  secureObject: 'secureObject',
  secureString: 'secureString',
  string: 'string',
};
export type ConnectionParameterTypes = (typeof ConnectionParameterTypes)[keyof typeof ConnectionParameterTypes];

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
    editor?: string;
    default?: any;
    dependentParameter?: {
      parameter: string;
      value: any;
    };
    requiresConnectionNamePrefix?: string;
  };
  tooltip?: string;
  /**
   * Describes if the parameter belongs to a credentials mapping.
   */
  credentialMapping?: ParameterCredentialMappingUIDefinition;
}

export interface ParameterCredentialMappingUIDefinition {
  /**
   * Name (identifier) of the mapping, parameters with the same mappingName belong to the same credentials item.
   */
  mappingName: string;
  displayName?: string | null;
  tooltip?: string | null;
  values: ParameterCredentialMapping[];
}

export interface ParameterCredentialMapping {
  /**
   * The type of credential supported by this parameter.
   */
  type: string;
  /**
   * The key used to read the expected value from the credential for this parameter.
   */
  credentialKeyName: string;
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
  additionalResourceUris?: string[];
}

export interface GatewaySetting {
  dataSourceType?: string;
  connectionDetails?: string[];
}

export type ConnectionAlternativeParameters = Record<string, ConnectionParameter>;

export interface ConnectionParameterMetadata {
  sourceType?: string;
}

export const ConnectionParameterSource = {
  AppConfiguration: 'AppConfiguration',
};
export type ConnectionParameterSource = (typeof ConnectionParameterSource)[keyof typeof ConnectionParameterSource];
export interface ConnectionParameter {
  type: string;
  metadata?: ConnectionParameterMetadata;
  uiDefinition?: ConnectionParameterUIDefinition;
  managedIdentitySettings?: ManagedIdentitySetting;
  oAuthSettings?: OAuthSetting;
  gateway?: GatewaySetting;
  parameterSource?: ConnectionParameterSource;
}

export const ConnectionParameterSchemaType = {
  string: 'string',
};
export type ConnectionParameterSchemaType = (typeof ConnectionParameterSchemaType)[keyof typeof ConnectionParameterSchemaType];

export const ConnectionParameterSchemaFormat = {
  azureAdTenantId: 'azureadtenantid',
};
export type ConnectionParameterSchemaFormat = (typeof ConnectionParameterSchemaFormat)[keyof typeof ConnectionParameterSchemaFormat];

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
  capabilities?: string[];
  connectionDisplayName?: string;
  displayName: string;
  description?: string;
  environmentBadge?: Badge;
  environment?: string;
  purpose?: string;
  iconUri: string;
  iconUrl?: string;
  runtimeUrls?: string[];
  primaryRuntimeUrl?: string;
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSets?: ConnectionParameterSets;
  connectionAlternativeParameters?: ConnectionAlternativeParameters;
  swagger?: any;
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
    releaseTag?: string;
  };
  externalDocs?: {
    url: string;
  };
  integrationServiceEnvironment?: {
    id: string;
  };
  tier?: string;
  isCustomApi?: boolean;
  testConnectionUrl?: string;
  testConnectionOperationName?: string;
  tags?: string[];
  isBuiltIn?: boolean;
}

export type Connector = ArmResource<ConnectorProperty>;

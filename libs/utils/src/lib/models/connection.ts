import type { ArmResource } from './armresource';

export interface Principal {
  displayName: string;
  email: string;
  id: string;
  type: string;
}

export interface ConnectionStatusError {
  code: string;
  message: string;
}

export interface ConnectionStatus {
  error?: ConnectionStatusError;
  status: string;
  target?: string;
}

export interface ValueObject {
  value: any; // tslint:disable-line: no-any
}

export interface ConnectionParameterSet {
  name: string;
  values: Record<string, ValueObject>;
}

export interface ConnectionProperties extends Record<string, any> {
  apiId: string;
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParametersSet?: ConnectionParameterSet;
  createdBy?: Principal;
  createdTime: string;
  displayName: string;
  iconUri: string;
  overallStatus?: string; // TODO(sopai): Make this a required property once APIHub changes are deployed to prod. danielle can we do this?
  parameterValueType?: string;
  statuses: ConnectionStatus[];
  testLinks?: TestLink[];
  accountName?: string;
}

export type Connection = ArmResource<ConnectionProperties>;

export interface ConnectionParameter {
  /**
   * @member {string} connectionId - A string with the connection ID of a dependent connector
   * @example /providers/Microsoft.PowerApps/apis/shared_onedrive/connections/{connectionName}
   */
  connectionId: string;

  /**
   * @member {string} id - A string with the API Hubs ID for a connection
   * @example tip1-shared/onedrive/{connectionName}
   */
  id: string;

  /**
   * @member {string} url - A string with the API Hubs full URL for a connection
   * @example https://tip1-shared.azure-apim.net/apim/onedrive/{connectionName}
   */
  url: string;
}

export interface TestLink {
  method: string;
  requestUri: string;
}

import type { ArmResource } from './armresource';
import type { ConnectionParameter, ConnectionParameterSet } from './connector';

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

interface Api {
  name: string;
  displayName: string;
  description: string;
  iconUri: string;
  brandColor: string;
  category: string;
  id: string;
  type: string;
}

export interface ConnectionParameterValues {
  authType?: string;
  gateway?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface ConnectionParameterSetValues {
  name: string;
  values: Record<string, ValueObject>;
}

export interface ValueObject {
  value: any;
}

export interface ConnectionAuthenticatedUser {
  name?: string;
  objectId?: string;
  tenantId?: string;
}

export interface ConnectionProperties {
  authenticatedUser?: ConnectionAuthenticatedUser;
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParametersSet?: ConnectionParameterSet;
  createdBy?: Principal;
  createdTime: string;
  displayName: string;
  overallStatus: string;
  parameterValues?: ConnectionParameterValues;
  parameterValueType?: string;
  statuses: ConnectionStatus[];
  testLinks?: TestConnectionObject[];
  testRequests?: TestConnectionObject[];
  accountName?: string;
  api: Api;
  connectionRuntimeUrl?: string;
}

export type Connection = ArmResource<ConnectionProperties>;

export interface TestConnectionObject {
  body?: string;
  method: string;
  requestUri: string;
}

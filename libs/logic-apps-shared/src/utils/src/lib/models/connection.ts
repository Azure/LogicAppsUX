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

export interface ConnectionParameterSetValues {
  name: string;
  values: Record<string, ValueObject>;
}

export interface ValueObject {
  value: any;
}

export interface ConnectionProperties {
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParametersSet?: ConnectionParameterSet;
  createdBy?: Principal;
  createdTime: string;
  displayName: string;
  overallStatus: string;
  parameterValueType?: string;
  statuses: ConnectionStatus[];
  testLinks?: TestConnectionObject[];
  testRequests?: TestConnectionObject[];
  accountName?: string;
  api: Api;
  connectionRuntimeUrl?: string;
}

export type Connection = ArmResource<ConnectionProperties>;

interface TestConnectionObject {
  body?: string;
  method: string;
  requestUri: string;
}

import { BaseException } from '@microsoft-logic-apps/utils';
import type { Exception } from '@microsoft-logic-apps/utils';

export const ConnectorConnectionExceptionName = 'Core.ConnectorConnectionException';

export enum ConnectorConnectionErrorCode {
  AUTH_FAILED = 'AuthFailed',
  CREATE_CONNECTION_FAILED = 'CreateConnectionFailed',
  CREATE_SIMPLE_CONNECTION_FAILED = 'CreateSimpleConnectionFailed',
  DELETE_CONNECTION_FAILED = 'DeleteConnectionFailed',
  FIRST_PARTY_AUTH_FAILED = 'FirstPartyAuthFailed',
  UNDEFINED_CONNECTION_REFERENCE = 'UndefinedConnectionReference',
}

export class ConnectorConnectionException extends BaseException {
  constructor(code: string, message: string, innerException?: Exception) {
    super(ConnectorConnectionExceptionName, message, code, /* data */ undefined, innerException);
  }
}

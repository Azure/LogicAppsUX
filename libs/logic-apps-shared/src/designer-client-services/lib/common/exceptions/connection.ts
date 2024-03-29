import type { Exception } from '../../../../utils/src';
import { BaseException } from '../../../../utils/src';

export const ConnectorConnectionExceptionName = 'Core.ConnectorConnectionException';

export const ConnectorConnectionErrorCode = {
  AUTH_FAILED: 'AuthFailed',
  CREATE_CONNECTION_FAILED: 'CreateConnectionFailed',
  CREATE_SIMPLE_CONNECTION_FAILED: 'CreateSimpleConnectionFailed',
  DELETE_CONNECTION_FAILED: 'DeleteConnectionFailed',
  FIRST_PARTY_AUTH_FAILED: 'FirstPartyAuthFailed',
  UNDEFINED_CONNECTION_REFERENCE: 'UndefinedConnectionReference',
} as const;

export class ConnectorConnectionException extends BaseException {
  constructor(code: string, message: string, innerException?: Exception) {
    super(ConnectorConnectionExceptionName, message, code, /* data */ undefined, innerException);
  }
}

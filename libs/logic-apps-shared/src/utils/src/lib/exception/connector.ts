import { BaseException } from './baseexception';
import type { Exception } from './exception';

export const ConnectorServiceExceptionName = 'Host.ConnectorServiceException';

export const ConnectorServiceErrorCode = {
  API_EXECUTION_FAILED: 'ApiExecutionFailed',
  API_EXECUTION_FAILED_WITH_ERROR: 'ApiExecutionFailedWithError',
};
export type ConnectorServiceErrorCode = (typeof ConnectorServiceErrorCode)[keyof typeof ConnectorServiceErrorCode];

export class ConnectorServiceException extends BaseException {
  // tslint:disable-next-line: no-any
  constructor(code: ConnectorServiceErrorCode, message: string, data?: Record<string, any>, innerException?: Exception | any) {
    super(ConnectorServiceExceptionName, message, code, data, innerException);
  }
}

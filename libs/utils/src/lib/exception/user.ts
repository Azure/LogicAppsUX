import { BaseException } from './baseexception';
import type { Exception } from './exception';

const UserExceptionName = 'Core.UserError';

export enum UserErrorCode {
  TEST_CONNECTION_FAILED = 'TestConnectionFailed',
}

export class UserException extends BaseException {
  constructor(code: UserErrorCode, message: string, data?: Record<string, any>, innerException?: Exception | any) {
    super(UserExceptionName, message, code, data, innerException);
  }
}

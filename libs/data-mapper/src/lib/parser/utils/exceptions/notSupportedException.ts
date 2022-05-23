import { BaseException } from '@microsoft-logic-apps/utils';

export const InvalidRequestExceptionName = 'Core.ValidationException';

export enum NotSupportedErrorCode {
  GENERATE_MAP_CODE = 'GenerateMapCode',
}

export class NotSupportedException extends BaseException {
  constructor(code: NotSupportedErrorCode, message: string, data?: Record<string, any>) {
    super(InvalidRequestExceptionName, message, code, data);
  }
}

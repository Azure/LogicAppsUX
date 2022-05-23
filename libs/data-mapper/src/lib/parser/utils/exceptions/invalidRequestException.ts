import { BaseException } from '@microsoft-logic-apps/utils';

export const InvalidRequestExceptionName = 'Core.ValidationException';

export enum InvalidRequestErrorCode {
  GENERATE_MAP_CODE = 'GenerateMapCode',
}

export class InvalidRequestException extends BaseException {
  constructor(code: InvalidRequestErrorCode, message: string, data?: Record<string, any>) {
    super(InvalidRequestExceptionName, message, code, data);
  }
}

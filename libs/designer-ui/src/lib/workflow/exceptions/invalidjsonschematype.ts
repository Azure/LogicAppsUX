import { BaseException } from '@microsoft/utils-logic-apps';

export class InvalidJsonSchemaTypeException extends BaseException {
  constructor(message: string, data?: Record<string, any>, innerException?: any) {
    super('Common.InvalidJsonSchemaTypeException', message, /* code */ undefined, data, innerException);
  }
}

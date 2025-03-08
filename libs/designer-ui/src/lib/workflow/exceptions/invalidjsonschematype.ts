import { BaseException } from '@microsoft/logic-apps-shared';

export class InvalidJsonSchemaTypeException extends BaseException {
  constructor(message: string, data?: Record<string, any>, innerException?: any) {
    super('Common.InvalidJsonSchemaTypeException', message, /* code */ undefined, data, innerException);
  }
}

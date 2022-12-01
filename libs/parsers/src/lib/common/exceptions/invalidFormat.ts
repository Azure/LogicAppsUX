import { BaseException } from '@microsoft/utils-logic-apps';

export const InvalidFormatExceptionName = 'Common.InvalidFormatException';

export class InvalidFormatException extends BaseException {
  constructor(message: string) {
    super(InvalidFormatExceptionName, message);
  }
}

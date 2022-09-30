import { BaseException } from '@microsoft-logic-apps/utils';

export const InvalidFormatExceptionName = 'Common.InvalidFormatException';

export class InvalidFormatException extends BaseException {
  constructor(message: string) {
    super(InvalidFormatExceptionName, message);
  }
}

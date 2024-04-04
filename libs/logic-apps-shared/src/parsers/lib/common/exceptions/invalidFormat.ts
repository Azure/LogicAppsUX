import { BaseException } from '../../../../utils/src';

export const InvalidFormatExceptionName = 'Common.InvalidFormatException';

export class InvalidFormatException extends BaseException {
  constructor(message: string) {
    super(InvalidFormatExceptionName, message);
  }
}

import { BaseException } from "./baseexception";

export const ArgumentExceptionName = 'Common.ArgumentException';

export class ArgumentException extends BaseException {
    constructor(message: string) {
        super(ArgumentExceptionName, message);
    }
}

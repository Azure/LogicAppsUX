import { BaseException } from './baseexception';

export const SerializationExceptionName = 'Core.SerializationException';

export enum SerializationErrorCode {
  INVALID_CONNECTIONS = 'InvalidConnections',
  INVALID_SETTINS = 'InvalidSettings',
  INVALID_PARAMETERS = 'InvalidParameters',
}

export class SerializationException extends BaseException {
  constructor(code: SerializationErrorCode, message: string, data: Record<string, any>) {
    super(SerializationExceptionName, message, code, data);
  }
}

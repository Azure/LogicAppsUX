import { BaseException } from './baseexception';

export const SerializationExceptionName = 'Core.SerializationException';

export const SerializationErrorCode = {
  INVALID_CONNECTIONS: 'InvalidConnections',
  INVALID_SETTINS: 'InvalidSettings',
  INVALID_PARAMETERS: 'InvalidParameters',
};
export type SerializationErrorCode = (typeof SerializationErrorCode)[keyof typeof SerializationErrorCode];

export class SerializationException extends BaseException {
  constructor(code: SerializationErrorCode, message: string, data: Record<string, any>) {
    super(SerializationExceptionName, message, code, data);
  }
}

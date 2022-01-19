import { Exception } from './exception';

export abstract class BaseException extends Error implements Exception {
  constructor(
    public name: string,
    public message: string,
    public code?: string,
    public data?: Record<string, any> /* tslint:disable-line: no-any */,
    public innerException?: Exception | any /* tslint:disable-line: no-any */
  ) {
    super(message);
  }
}

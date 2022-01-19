import { Exception } from './exception';

export abstract class BaseException extends Error implements Exception {
  constructor(
    public override name: string,
    public override message: string,
    public code?: string,
    public data?: Record<string, any>,
    public innerException?: Exception | any
  ) {
    super(message);
  }
}

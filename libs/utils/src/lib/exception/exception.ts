export interface Exception {
  name: string;
  code?: string;
  message: string;
  data?: Record<string, any> /* tslint:disable-line: no-any */;
  // NOTE(prshrest): any is used as a fallback in case it is not an Exception.
  innerException?: Exception | any /* tslint:disable-line: no-any */;
  stack?: string;
}

// tslint:disable-next-line: no-any
export function isException(value: any): value is Exception {
  return (
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    (value.code === undefined || typeof value.code === 'string') &&
    typeof value.message === 'string' &&
    (value.data === undefined || typeof value.data === 'object') &&
    (value.stack === undefined || typeof value.stack === 'string')
  );
}

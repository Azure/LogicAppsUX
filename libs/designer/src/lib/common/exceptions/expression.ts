import { BaseException } from './baseexception';

export const UnsupportedExceptionName = 'Common.UnsupportedException';

export enum ExpressionExceptionCode {
  MANIFEST_NOT_FOUND = 'ManifestNotFound',
  OPERATION_NOT_FOUND = 'OperationInfoNotFound',
  RUNTIME_EXPRESSION = 'RuntimeExpressionInDynamicCall',
  RENDER_MULTIPLE_TRIGGERS = 'RenderMultipleTriggers',
  RENDER_NO_TRIGGERS = 'RenderNoTriggers',
  CONTINUATION_TOKEN = 'ContinuationToken',
  MSI_CONNECTION = 'MsiConnectionPresent',
  INVALID_CONNECTION = 'InvalidConnection',
}

export class UnsupportedException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    // tslint:disable-line: no-any
    super(UnsupportedExceptionName, message, code, data);
  }
}

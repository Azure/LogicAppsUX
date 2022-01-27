import { BaseException } from '@microsoft-logic-apps/utils';
import { ExpressionExceptionCode } from './expression';

export const ScannerExceptionName = 'Workflow.ExpressionScannerException';

export class ScannerException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    // tslint:disable-line: no-any
    super(ScannerExceptionName, message, code, data);
  }
}

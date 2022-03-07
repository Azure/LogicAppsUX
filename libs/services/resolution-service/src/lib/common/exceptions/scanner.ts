import type { ExpressionExceptionCode } from './expression';
import { BaseException } from '@microsoft-logic-apps/utils';

export const ScannerExceptionName = 'Workflow.ExpressionScannerException';

export class ScannerException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    super(ScannerExceptionName, message, code, data);
  }
}

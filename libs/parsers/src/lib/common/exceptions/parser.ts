import type { ExpressionExceptionCode } from './expression';
import { BaseException } from '@microsoft-logic-apps/utils';

export const ParserExceptionName = 'Workflow.ExpressionParserException';

export class ParserException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    super(ParserExceptionName, message, code, data);
  }
}

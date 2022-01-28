import { BaseException } from '@microsoft-logic-apps/utils';
import { ExpressionExceptionCode } from './expression';

export const ParserExceptionName = 'Workflow.ExpressionParserException';

export class ParserException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    super(ParserExceptionName, message, code, data);
  }
}

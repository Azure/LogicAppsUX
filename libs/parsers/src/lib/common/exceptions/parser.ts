import type { ExpressionExceptionCode } from './expression';
import { BaseException } from '@microsoft-logic-apps/utils';

export const ParserExceptionName = 'Workflow.ExpressionParserException';

/**
 * The expression parser error code.
 */
export enum ExpressionParserErrorCode {
  NOT_EXPRESSION = 'NotExpression',
  SEGMENT_NOT_TERMINATED = 'SegmentNotTerminated',
  UNEXPECTED_DEREFERENCE = 'UnexpectedDereference',
}

export class ParserException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    super(ParserExceptionName, message, code, data);
  }
}

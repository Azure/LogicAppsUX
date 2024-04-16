import type { ExpressionExceptionCode } from './expression';
import { BaseException } from '../../../../utils/src';

export const ParserExceptionName = 'Workflow.ExpressionParserException';

/**
 * The expression parser error code.
 */
export const ExpressionParserErrorCode = {
  NOT_EXPRESSION: 'NotExpression',
  SEGMENT_NOT_TERMINATED: 'SegmentNotTerminated',
  UNEXPECTED_DEREFERENCE: 'UnexpectedDereference',
} as const;
export type ExpressionParserErrorCode = (typeof ExpressionParserErrorCode)[keyof typeof ExpressionParserErrorCode];

export class ParserException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    super(ParserExceptionName, message, code, data);
  }
}

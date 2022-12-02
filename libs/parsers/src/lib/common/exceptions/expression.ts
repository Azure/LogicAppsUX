import { BaseException } from '@microsoft/utils-logic-apps';

export enum ExpressionExceptionCode {
  UNRECOGNIZED_EXPRESSION = 'UnrecognizedExpression',
  EMPTY_VALUE = 'EmptyValue',
  LIMIT_EXCEEDED = 'LimitExceeded',
  STRING_LITERAL_NOT_TERMINATED = 'StringLiteralNotTerminated',
  TOKEN_NOT_FOUND = 'TokenNotFound',
  UNEXPECTED_CHARACTER = 'UnexpectedCharacter',
}

export const ExpressionExceptionName = 'Workflow.ExpressionException';

export class ExpressionException extends BaseException {
  constructor(message: string, code?: ExpressionExceptionCode, data?: Record<string, any>) {
    super(ExpressionExceptionName, message, code, data);
  }
}

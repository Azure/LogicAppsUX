import { expressionMock } from '../../__mocks__/expressions';
import type { Expression } from '../../models/expression';

export const getExpressions = (): Promise<Expression[]> => {
  // call API here
  return Promise.resolve(expressionMock);
};

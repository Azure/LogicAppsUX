import { expressionMock } from '../../__mocks__/expressions';
import type { Expression } from '../../models/Expression';

// import { SchemaSelectionServiceInstance } from '../services';

export const getExpressions = (): Promise<Expression[]> => {
  // const service = SchemaSelectionServiceInstance();
  // const response = service.getExpressionsManifest();
  // console.log(response);
  return Promise.resolve(expressionMock);
};

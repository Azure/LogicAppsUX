import { functionMock } from '../../__mocks__/functions';
import type { FunctionData } from '../../models/Function';

// import { SchemaSelectionServiceInstance } from '../services';

export const getFunctions = (): Promise<FunctionData[]> => {
  // const service = SchemaSelectionServiceInstance();
  // const response = service.getFunctionsManifest();
  // console.log(response);
  return Promise.resolve(functionMock);
};

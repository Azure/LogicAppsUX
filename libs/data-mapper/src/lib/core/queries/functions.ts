import { functionMock } from '../../models/Function';
import type { FunctionData } from '../../models/Function';
import { DataMapperApiServiceInstance } from '../services';

export const getFunctions = (): Promise<FunctionData[]> => {
  const service = DataMapperApiServiceInstance();

  return service
    .getFunctionsManifest()
    .then((response) => {
      return response.transformFunctions;
    })
    .catch((error: Error) => {
      // Returning functionMock on expected failure to reach API for dev-ing w/o runtime
      console.error(`Error getting functions manifest: ${error.message}`);

      return Promise.resolve(functionMock);
    });
};

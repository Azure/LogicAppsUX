import type { FunctionData } from '../../models/Function';
import { functionMock, pseudoFunctions } from '../../models/Function';
import { DataMapperApiServiceInstance } from '../services';

export const getFunctions = (): Promise<FunctionData[]> => {
  const service = DataMapperApiServiceInstance();

  return service
    .getFunctionsManifest()
    .then((response) => {
      return [...response.transformFunctions, ...pseudoFunctions];
    })
    .catch((error: Error) => {
      // Returning functionMock on expected failure to reach API for dev-ing w/o runtime
      console.error(`Error getting functions manifest: ${error.message}`);

      return Promise.resolve(functionMock);
    });
};

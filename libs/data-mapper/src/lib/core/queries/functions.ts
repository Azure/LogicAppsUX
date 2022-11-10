import type { FunctionData } from '../../models/Function';
import { functionMock, pseudoFunctions } from '../../models/Function';
import { DataMapperApiServiceInstance } from '../services';

export const getFunctions = (): Promise<FunctionData[]> => {
  const service = DataMapperApiServiceInstance();

  return service
    .getFunctionsManifest()
    .then((response) => {
      // Ensure Functions with no inputs from the manifest have an empty array instead of the property being undefined to match our FunctionData schema/assumptions
      const functionManifestFunctions = response.transformFunctions.map((manifestFunction) =>
        manifestFunction.inputs ? { ...manifestFunction } : { ...manifestFunction, inputs: [] }
      );

      return [...functionManifestFunctions, ...pseudoFunctions];
    })
    .catch((error: Error) => {
      // Returning functionMock on expected failure to reach API for dev-ing w/o runtime
      console.error(`Error getting functions manifest: ${error.message}`);

      return Promise.resolve(functionMock);
    });
};

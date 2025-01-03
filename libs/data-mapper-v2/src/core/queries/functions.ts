import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { FunctionData } from '../../models/Function';
import { pseudoFunctions } from '../../models/Function';
import { LogCategory } from '../../utils/Logging.Utils';
import { DataMapperApiServiceInstance } from '../services';

// Returns a Promise of either the Function manifest, or the response's error message
export const getFunctions = (): Promise<FunctionData[] | string> => {
  const service = DataMapperApiServiceInstance();

  return service
    .getFunctionsManifest()
    .then((response) => {
      // Ensure Functions with no inputs from the manifest have an empty array instead of the property being undefined
      // to match our FunctionData schema/assumptions
      const functionManifestFunctions = response.transformFunctions.map((manifestFunction) =>
        manifestFunction.inputs ? { ...manifestFunction } : { ...manifestFunction, inputs: [] }
      );

      const filteredFunctions = functionManifestFunctions.filter((manifestFunction) => !manifestFunction.functionName.startsWith('$'));

      return [...filteredFunctions, ...pseudoFunctions];
    })
    .catch((error: Error) => {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: `${LogCategory.FunctionsQuery}/getFunctionsManifest`,
        message: `Error getting functions manifest: ${error.message}`,
      });

      return error.message;
    });
};

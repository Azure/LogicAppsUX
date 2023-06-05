import {
  collectionBranding,
  conversionBranding,
  dateTimeBranding,
  logicalBranding,
  mathBranding,
  stringBranding,
  utilityBranding,
} from '../constants/FunctionConstants';
import { reservedMapNodeParamsArray } from '../constants/MapDefinitionConstants';
import type { SchemaNodeExtended } from '../models';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import { FunctionCategory, ifPseudoFunctionKey } from '../models/Function';
import { isConnectionUnit } from './Connection.Utils';
import { LogCategory, LogService } from './Logging.Utils';
import { isSchemaNodeExtended } from './Schema.Utils';
import { isAGuid } from '@microsoft/utils-logic-apps';

export const getFunctionBrandingForCategory = (functionCategory: FunctionCategory) => {
  switch (functionCategory) {
    case FunctionCategory.Collection: {
      return collectionBranding;
    }
    case FunctionCategory.DateTime: {
      return dateTimeBranding;
    }
    case FunctionCategory.Logical: {
      return logicalBranding;
    }
    case FunctionCategory.Math: {
      return mathBranding;
    }
    case FunctionCategory.String: {
      return stringBranding;
    }
    case FunctionCategory.Utility: {
      return utilityBranding;
    }
    case FunctionCategory.Conversion: {
      return conversionBranding;
    }
    default: {
      LogService.error(LogCategory.FunctionUtils, 'getFunctionBrandingForCategory', {
        message: `Invalid category provided: ${functionCategory}`,
      });

      return utilityBranding;
    }
  }
};

export const findFunctionForFunctionName = (nodeKey: string, functions: FunctionData[]): FunctionData | undefined =>
  functions.find((functionData) => functionData.functionName === nodeKey);

export const findFunctionForKey = (nodeKey: string, functions: FunctionData[]): FunctionData | undefined =>
  functions.find((functionData) => functionData.key === nodeKey);

export const isFunctionData = (node: SchemaNodeExtended | FunctionData): node is FunctionData => 'functionName' in node;

export const getFunctionOutputValue = (inputValues: string[], functionName: string) => {
  if (!functionName) {
    return inputValues.join(',');
  }

  let outputValue = `${functionName}(`;

  inputValues.forEach((inputValue, idx) => {
    if (inputValue) {
      outputValue += `${idx === 0 ? '' : ', '}${inputValue}`;
    }
  });

  return `${outputValue})`;
};

export const functionInputHasInputs = (fnInputReactFlowKey: string, connections: ConnectionDictionary): boolean => {
  const fnInputConnection = connections[fnInputReactFlowKey];
  return !!fnInputConnection && Object.values(fnInputConnection.inputs).some((inputConArr) => inputConArr.length > 0);
};

export const getIndexValueForCurrentConnection = (currentConnection: Connection): string => {
  const inputNode =
    isConnectionUnit(currentConnection.inputs[0][0]) && isSchemaNodeExtended(currentConnection.inputs[0][0].node)
      ? currentConnection.inputs[0][0].node
      : undefined;
  if (inputNode) {
    return calculateIndexValue(inputNode);
  } else {
    LogService.error(LogCategory.FunctionUtils, 'getIndexValueForCurrentConnection', {
      message: `Didn't find inputNode to make index value`,
      data: {
        connection: currentConnection,
      },
    });

    return '';
  }
};

export const calculateIndexValue = (currentNode: SchemaNodeExtended): string => {
  let repeatedNodes = currentNode.pathToRoot.reduce((acc, { repeating }) => acc + (repeating ? 1 : 0), 0);
  let result = '$';
  while (repeatedNodes > 0) {
    if (repeatedNodes >= 26) {
      result += 'z';
      repeatedNodes -= 26;
    } else {
      result += String.fromCharCode(96 + repeatedNodes);
      break;
    }
  }

  return result;
};

export const formatDirectAccess = (indexValue: string, scope: string, destination: string) => {
  return destination.replace(scope, `${scope}[${indexValue}]`);
};

export const isKeyAnIndexValue = (key: string): boolean => key.startsWith('$') && !reservedMapNodeParamsArray.includes(key);

export const isIfAndGuid = (key: string) => {
  return key.startsWith(ifPseudoFunctionKey) && isAGuid(key.substring(ifPseudoFunctionKey.length + 1));
};

export const functionsForLocation = (functions: FunctionDictionary, targetKey: string) =>
  Object.fromEntries(
    Object.entries(functions).filter(([_key, value]) => value.functionLocations.some((location) => location.key === targetKey))
  );

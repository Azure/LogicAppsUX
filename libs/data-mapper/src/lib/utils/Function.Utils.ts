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
import { InputFormat, type SchemaNodeDictionary, type SchemaNodeExtended } from '../models';
import type { Connection, ConnectionDictionary, InputConnection } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import { FunctionCategory, directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import { getConnectedTargetSchemaNodes, isConnectionUnit, isCustomValue } from './Connection.Utils';
import { getInputValues } from './DataMap.Utils';
import { LogCategory, LogService } from './Logging.Utils';
import { addTargetReactFlowPrefix } from './ReactFlow.Util';
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

export const getIndexValueForCurrentConnection = (currentConnection: Connection, connections: ConnectionDictionary): string => {
  const firstInput = currentConnection.inputs[0][0];

  if (isCustomValue(firstInput)) {
    return firstInput;
  } else if (isConnectionUnit(firstInput)) {
    const node = firstInput.node;
    if (isSchemaNodeExtended(node)) {
      return calculateIndexValue(node);
    } else {
      // Function, try moving back the chain to find the source
      return getIndexValueForCurrentConnection(connections[firstInput.reactFlowKey], connections);
    }
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

export const getFunctionLocationsForAllFunctions = (
  dataMapConnections: ConnectionDictionary,
  flattenedTargetSchema: SchemaNodeDictionary
): FunctionDictionary => {
  const functionNodes: FunctionDictionary = {};
  for (const connectionKey in dataMapConnections) {
    const func = dataMapConnections[connectionKey].self.node as FunctionData;
    if (func.functionName !== undefined) {
      const targetNodesConnectedToFunction = getConnectedTargetSchemaNodes([dataMapConnections[connectionKey]], dataMapConnections);

      const parentNodes: SchemaNodeExtended[] = [];
      targetNodesConnectedToFunction.forEach((childNode) => {
        if (childNode.parentKey) {
          parentNodes.push(flattenedTargetSchema[addTargetReactFlowPrefix(childNode.parentKey)]);
        }
      });

      const combinedTargetNodes = targetNodesConnectedToFunction.concat(parentNodes);
      functionNodes[connectionKey] = { functionData: func, functionLocations: combinedTargetNodes };
    }
  }
  return functionNodes;
};
export const functionDropDownItemText = (key: string, node: FunctionData, connections: ConnectionDictionary) => {
  let fnInputValues: string[] = [];
  const connection = connections[key];

  if (connection) {
    fnInputValues = Object.values(connection.inputs)
      .flat()
      .map((input) => {
        if (!input) {
          return undefined;
        }

        if (isCustomValue(input)) {
          return input;
        }

        if (isFunctionData(input.node)) {
          if (input.node.key === indexPseudoFunctionKey) {
            const sourceNode = connections[input.reactFlowKey].inputs[0][0];
            return isConnectionUnit(sourceNode) && isSchemaNodeExtended(sourceNode.node) ? calculateIndexValue(sourceNode.node) : '';
          }

          if (functionInputHasInputs(input.reactFlowKey, connections)) {
            return `${input.node.functionName}(...)`;
          } else {
            return `${input.node.functionName}()`;
          }
        }

        // Source schema node
        return input.node.name;
      })
      .filter((value) => !!value) as string[];
  }

  const inputs = connections[key].inputs[0];
  const sourceNode = inputs && inputs[0];
  let nodeName: string;
  if (node.key === indexPseudoFunctionKey && isConnectionUnit(sourceNode) && isSchemaNodeExtended(sourceNode.node)) {
    nodeName = calculateIndexValue(sourceNode.node);
  } else if (node.key === directAccessPseudoFunctionKey) {
    const functionValues = getInputValues(connections[key], connections);
    nodeName =
      functionValues.length === 3
        ? formatDirectAccess(functionValues[0], functionValues[1], functionValues[2])
        : getFunctionOutputValue(fnInputValues, node.functionName);
  } else {
    nodeName = getFunctionOutputValue(fnInputValues, node.functionName);
  }

  return nodeName;
};

export const getInputName = (inputConnection: InputConnection | undefined, connectionDictionary: ConnectionDictionary) => {
  if (inputConnection) {
    return isCustomValue(inputConnection)
      ? inputConnection
      : isSchemaNodeExtended(inputConnection.node)
      ? inputConnection.node.name
      : functionDropDownItemText(inputConnection.reactFlowKey, inputConnection.node, connectionDictionary);
  }

  return undefined;
};

export const getInputValue = (inputConnection: InputConnection | undefined) => {
  if (inputConnection) {
    return isCustomValue(inputConnection) ? inputConnection : inputConnection.reactFlowKey;
  }

  return undefined;
};

export const addQuotesToString = (value: string) => {
  let formattedValue = value;

  const quote = '"';
  if (!value.startsWith(quote)) {
    formattedValue = quote.concat(value);
  }
  if (!value.endsWith(quote)) {
    formattedValue = formattedValue.concat(quote);
  }
  return formattedValue;
};

export const removeQuotesFromString = (value: string) => {
  let formattedValue = value;
  const quote = '"';
  if (formattedValue.endsWith(quote)) {
    formattedValue = formattedValue.substring(0, value.length - 1);
  }
  if (formattedValue.startsWith(quote)) {
    formattedValue = formattedValue.replace(quote, '');
  }
  return formattedValue;
};

export const hasOnlyCustomInputType = (functionData: FunctionData) =>
  functionData.inputs[0]?.inputEntryType === InputFormat.FilePicker || functionData.inputs[0]?.inputEntryType === InputFormat.TextBox;

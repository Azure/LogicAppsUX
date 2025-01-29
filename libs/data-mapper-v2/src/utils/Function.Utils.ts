import type { Node, XYPosition } from '@xyflow/react';
import {
  collectionBranding,
  conversionBranding,
  customBranding,
  dateTimeBranding,
  logicalBranding,
  mathBranding,
  stringBranding,
  utilityBranding,
} from '../constants/FunctionConstants';
import { reservedMapNodeParamsArray } from '../constants/MapDefinitionConstants';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../mapHandling/MapMetadataSerializer';
import type { Connection, ConnectionDictionary, InputConnection } from '../models/Connection';
import type { FunctionDictionary, FunctionData } from '../models/Function';
import { FunctionCategory, directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import { connectionDoesExist, isNodeConnection, isCustomValueConnection, isEmptyConnection } from './Connection.Utils';
import { getInputValues } from './DataMap.Utils';
import { LogCategory } from './Logging.Utils';
import { isSchemaNodeExtended } from './Schema.Utils';
import {
  isAGuid,
  InputFormat,
  type SchemaNodeDictionary,
  type SchemaNodeExtended,
  type FunctionMetadata,
  LogEntryLevel,
  LoggerService,
} from '@microsoft/logic-apps-shared';

export const getFunctionBrandingForCategory = (functionCategory: FunctionCategory) => {
  switch (functionCategory) {
    case FunctionCategory.Collection: {
      return collectionBranding;
    }
    case FunctionCategory.Custom: {
      return customBranding;
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
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: `${LogCategory.FunctionUtils}/getFunctionBrandingForCategory`,
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

export const isFunctionData = (node: SchemaNodeExtended | FunctionData): node is FunctionData =>
  Object.keys(node ?? {}).includes('functionName');

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
  return fnInputConnection?.inputs && fnInputConnection.inputs.length > 0;
};

export const getIndexValueForCurrentConnection = (currentConnection: Connection, connections: ConnectionDictionary): string => {
  const firstInput = currentConnection.inputs[0];

  if (isCustomValueConnection(firstInput)) {
    return firstInput.value;
  }
  if (isNodeConnection(firstInput)) {
    const node = firstInput.node;
    if (isSchemaNodeExtended(node)) {
      return calculateIndexValue(node);
    }
    // Function, try moving back the chain to find the source
    return getIndexValueForCurrentConnection(connections[firstInput.reactFlowKey], connections);
  }
  LoggerService().log({
    level: LogEntryLevel.Error,
    area: `${LogCategory.FunctionUtils}/getIndexValueForCurrentConnection`,
    message: `Didn't find inputNode to make index value`,
    args: [
      {
        connection: currentConnection,
      },
    ],
  });
  return '';
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

export const getFunctionNode = (data: FunctionData, id: string, position?: XYPosition): Node<any> => {
  return {
    id: id,
    type: 'functionNode',
    data: { functionData: data },
    position: position ?? { x: 200, y: 200 },
    draggable: true,
    selectable: false,
    measured: { width: 1, height: 1 },
  };
};

export const createFunctionDictionary = (
  dataMapConnections: ConnectionDictionary,
  _flattenedTargetSchema: SchemaNodeDictionary
): FunctionDictionary => {
  const functionNodes: FunctionDictionary = {};
  for (const connectionKey in dataMapConnections) {
    const func = dataMapConnections[connectionKey].self.node as FunctionData;
    if (func !== undefined) {
      // danielle to remove when deserialization is fixed
      if (func.functionName !== undefined) {
        functionNodes[connectionKey] = func;
      }
    }
  }
  return functionNodes;
};

export const assignFunctionNodePositionsFromMetadata = (
  connections: ConnectionDictionary,
  metadata: FunctionMetadata[],
  functions: FunctionDictionary
) => {
  Object.keys(functions).forEach((key) => {
    // find matching metadata
    const generatedMetadata = generateFunctionConnectionMetadata(key, connections);
    const id = convertConnectionShorthandToId(generatedMetadata);
    const matchingMetadata = metadata.find((meta) => meta.connectionShorthand === id);

    // assign position data to function in store
    functions[key] = {
      ...functions[key],
      position: matchingMetadata?.position,
    };
  });
  return functions;
};

export const getConnectedSourceSchema = (
  dataMapConnections: ConnectionDictionary,
  flattenedSourceSchema: SchemaNodeDictionary
): SchemaNodeDictionary => {
  const connectedSourceSchema: SchemaNodeDictionary = {};

  for (const connectionKey in dataMapConnections) {
    if (flattenedSourceSchema?.[connectionKey]) {
      connectedSourceSchema[connectionKey] = flattenedSourceSchema?.[connectionKey];
    }
  }

  return connectedSourceSchema;
};

export const functionDropDownItemText = (key: string, node: FunctionData, connections: ConnectionDictionary) => {
  let fnInputValues: string[] = [];
  const connection = connections[key];

  if (connection) {
    fnInputValues = Object.values(connection.inputs)
      .flat()
      .map((input) => {
        if (!input || isEmptyConnection(input)) {
          return undefined;
        }

        if (isCustomValueConnection(input)) {
          return input.value;
        }

        if (input.node && isFunctionData(input.node)) {
          if (input.node.key === indexPseudoFunctionKey) {
            const sourceNode = connections[input.reactFlowKey].inputs[0];
            return isNodeConnection(sourceNode) && isSchemaNodeExtended(sourceNode.node) ? calculateIndexValue(sourceNode.node) : '';
          }

          if (functionInputHasInputs(input.reactFlowKey, connections)) {
            return `${input.node.functionName}(...)`;
          }
          return `${input.node.functionName}()`;
        }

        // Source schema node
        return input.node?.name;
      })
      .filter((value) => !!value) as string[];
  }

  const inputs = connections?.[key]?.inputs?.[0];
  const sourceNode = inputs;
  let nodeName: string;
  if (node.key === indexPseudoFunctionKey && isNodeConnection(sourceNode) && isSchemaNodeExtended(sourceNode.node)) {
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

export const getInputName = (
  inputConnection: InputConnection | undefined,
  connectionDictionary: ConnectionDictionary
): string | undefined => {
  if (inputConnection && !isEmptyConnection(inputConnection)) {
    if (isCustomValueConnection(inputConnection)) {
      return inputConnection.value;
    }
    return isSchemaNodeExtended(inputConnection.node)
      ? inputConnection.node.name
      : functionDropDownItemText(inputConnection.reactFlowKey, inputConnection.node, connectionDictionary);
  }

  return undefined;
};

export const getInputValue = (inputConnection: InputConnection | undefined) => {
  if (connectionDoesExist(inputConnection)) {
    return isCustomValueConnection(inputConnection) ? inputConnection.value : inputConnection.reactFlowKey;
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

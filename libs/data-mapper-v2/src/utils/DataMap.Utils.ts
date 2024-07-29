import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import {
  directAccessPseudoFunction,
  directAccessPseudoFunctionKey,
  ifPseudoFunction,
  ifPseudoFunctionKey,
  indexPseudoFunction,
  indexPseudoFunctionKey,
} from '../models/Function';
import { findLast } from './Array.Utils';
import {
  applyConnectionValue,
  flattenInputs,
  isCustomValue,
  nodeHasSourceNodeEventually,
  nodeHasSpecificInputEventually,
} from './Connection.Utils';
import {
  findFunctionForFunctionName,
  findFunctionForKey,
  formatDirectAccess,
  getIndexValueForCurrentConnection,
  isFunctionData,
  isIfAndGuid,
} from './Function.Utils';
import { addReactFlowPrefix, addSourceReactFlowPrefix } from './ReactFlow.Util';
import { findNodeForKey, isSchemaNodeExtended } from './Schema.Utils';
import type { MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { isAGuid, SchemaType } from '@microsoft/logic-apps-shared';

export type UnknownNode = SchemaNodeExtended | FunctionData | undefined;

export const getParentId = (id: string): string => {
  const last = id.lastIndexOf('/');
  return id.substring(0, last);
};

export const getInputValues = (
  currentConnection: Connection | undefined,
  connections: ConnectionDictionary,
  shouldLocalizePaths = true
): string[] => {
  return currentConnection
    ? (flattenInputs(currentConnection.inputs)
        .flatMap((input) => {
          if (!input) {
            return undefined;
          }

          // Handle custom values, source schema node, and Function inputs for Function nodes
          if (isCustomValue(input)) {
            return input;
          }
          if (isSchemaNodeExtended(input.node)) {
            return shouldLocalizePaths && input.node.qName.startsWith('@') ? `./${input.node.key}` : input.node.key;
          }
          if (input.node.key === indexPseudoFunctionKey) {
            return getIndexValueForCurrentConnection(connections[input.reactFlowKey], connections);
          }
          if (input.node.key.startsWith(directAccessPseudoFunctionKey)) {
            const functionValues = getInputValues(connections[input.reactFlowKey], connections, false);
            return formatDirectAccess(functionValues[0], functionValues[1], functionValues[2]);
          }
          return collectFunctionValue(input.node, connections[input.reactFlowKey], connections, shouldLocalizePaths);
        })
        .filter((mappedInput) => !!mappedInput) as string[])
    : [];
};

const combineFunctionAndInputs = (functionData: FunctionData, inputs: string[]): string => {
  return functionData.functionName ? `${functionData.functionName}(${inputs.join(', ')})` : inputs.join(', ');
};

export const collectFunctionValue = (
  node: FunctionData,
  currentConnection: Connection,
  connections: ConnectionDictionary,
  shouldLocalizePaths: boolean
): string => {
  // Special case where the index is used directly
  if (currentConnection.self.node.key === indexPseudoFunctionKey) {
    return getIndexValueForCurrentConnection(currentConnection, connections);
  }

  const inputValues = getInputValues(currentConnection, connections, shouldLocalizePaths);

  // Special case for conditionals
  if (currentConnection.self.node.key === ifPseudoFunctionKey) {
    return inputValues[0];
  }

  return combineFunctionAndInputs(node, inputValues);
};

export interface SequenceValueResult {
  sequenceValue: string;
  hasIndex: boolean;
  rootLoop: string;
}

export const collectSequenceValue = (
  node: FunctionData,
  currentConnection: Connection,
  connections: ConnectionDictionary,
  shouldLocalizePaths: boolean
): SequenceValueResult => {
  // Special case where the index is used directly
  const result: SequenceValueResult = {
    sequenceValue: '',
    hasIndex: false,
    rootLoop: '',
  };

  if (currentConnection.self.node.key === indexPseudoFunctionKey) {
    result.hasIndex = true;
  }

  const inputValues = getInputValues(currentConnection, connections, shouldLocalizePaths);

  const valueToTrim = extractScopeFromLoop(inputValues[0]) || inputValues[0];
  const localizedInputValues =
    shouldLocalizePaths && valueToTrim
      ? inputValues.map((value) => {
          return value.replaceAll(`${valueToTrim}/`, '');
        })
      : inputValues;

  if (valueToTrim) {
    result.rootLoop = valueToTrim;
  }

  // Special case for conditionals
  if (currentConnection.self.node.key === ifPseudoFunctionKey) {
    result.sequenceValue = localizedInputValues[0];
  } else {
    result.sequenceValue = combineFunctionAndInputs(node, localizedInputValues);
  }

  return result;
};

export const collectConditionalValues = (currentConnection: Connection, connections: ConnectionDictionary): [string, string] => {
  const inputValues = getInputValues(currentConnection, connections);

  return [inputValues[0], inputValues[1]];
};

export const isValidToMakeMapDefinition = (connections: ConnectionDictionary): boolean => {
  // All functions connections must eventually terminate into the source
  const connectionsArray = Object.entries(connections);

  const allNodesTerminateIntoSource = connectionsArray
    .filter(([key, _connection]) => key.startsWith(targetPrefix))
    .every(([_key, targetConnection]) => nodeHasSourceNodeEventually(targetConnection, connections));

  const allRequiredInputsFilledOut = connectionsArray.every(([_key, connection]) => {
    const selfNode = connection.self.node;
    if (isFunctionData(selfNode)) {
      return (
        !connection.outputs.length ||
        selfNode.inputs.every((nodeInput, index) => {
          return nodeInput.isOptional || connection.inputs[index].length > 0;
        })
      );
    }

    return true;
  });

  // Is valid to generate the map definition
  return allNodesTerminateIntoSource && allRequiredInputsFilledOut;
};

const isQuotedString = (value: string): boolean => {
  return (
    value.length > 0 && ((value[0] === '"' && value[value.length - 1] === '"') || (value[0] === "'" && value[value.length - 1] === "'"))
  );
};

export const amendSourceKeyForDirectAccessIfNeeded = (sourceKey: string): [string, string] => {
  // Parse the outermost Direct Access (if present) into the typical Function format
  let mockDirectAccessFnKey: string | undefined = undefined;
  const [daOpenBracketIdx, daClosedBracketIdx] = [sourceKey.indexOf('['), sourceKey.lastIndexOf(']')];
  if (daOpenBracketIdx > -1 && daClosedBracketIdx > -1 && !isQuotedString(sourceKey)) {
    // Need to isolate the singular key the DA is apart of as it could be wrapped in a function, etc.
    let keyWithDaStartIdx = 0;
    let keyWithDaEndIdx = sourceKey.length;
    // For start, back track until idx-0, whitespace, or '('
    for (let i = daOpenBracketIdx; i >= 0; i--) {
      if (sourceKey[i] === ' ' || sourceKey[i] === '(') {
        keyWithDaStartIdx = i + 1; // +1 as substr includes start idx but excludes end idx
        break;
      }
    }
    // For end, idx-length-1, ',', or ')'
    for (let i = daClosedBracketIdx; i < sourceKey.length; i++) {
      if (sourceKey[i] === ',' || sourceKey[i] === ')') {
        keyWithDaEndIdx = i;
        break;
      }
    }

    // Only amend DA if the expression is not wrapped in a function, etc.
    // Otherwise a bracket in one parameter may be matched with a bracked in another parameter.
    if (keyWithDaStartIdx === 0 && keyWithDaEndIdx === sourceKey.length) {
      mockDirectAccessFnKey = `${directAccessPseudoFunctionKey}(`;
      mockDirectAccessFnKey += `${sourceKey.substring(daOpenBracketIdx + 1, daClosedBracketIdx)}, `; // Index value
      mockDirectAccessFnKey += `${sourceKey.substring(0, daOpenBracketIdx)}, `; // Scope (source loop element)
      mockDirectAccessFnKey += `${sourceKey.substring(0, daOpenBracketIdx)}${sourceKey.substring(daClosedBracketIdx + 1)}`; // Output value
      mockDirectAccessFnKey += ')';

      return [mockDirectAccessFnKey, mockDirectAccessFnKey];
    }
  }

  return [sourceKey, ''];
};

export const getSourceNode = (
  sourceKey: string,
  sourceSchema: SchemaExtended,
  endOfFunctionIndex: number,
  functions: FunctionData[],
  createdNodes: { [completeFunction: string]: string }
) => {
  if (sourceKey.startsWith(indexPseudoFunctionKey)) {
    // Handle index variable usage
    // eslint-disable-next-line no-param-reassign
    createdNodes[sourceKey] = sourceKey; // Bypass below block since we already have rfKey here
    return indexPseudoFunction;
  }
  if (sourceKey.startsWith(directAccessPseudoFunctionKey)) {
    return directAccessPseudoFunction;
  }
  if ((sourceKey.startsWith(ifPseudoFunctionKey) && sourceKey.charAt(ifPseudoFunctionKey.length) === '(') || isIfAndGuid(sourceKey)) {
    // We don't want if-else to be caught here
    // eslint-disable-next-line no-param-reassign
    createdNodes[sourceKey] = sourceKey;
    return ifPseudoFunction;
  }
  if (endOfFunctionIndex > -1) {
    // We found a Function in source key -> let's find its data
    return findFunctionForFunctionName(sourceKey.substring(0, endOfFunctionIndex), functions);
  }
  return findNodeForKey(sourceKey, sourceSchema.schemaTreeRoot, false);
};

export const getDestinationNode = (targetKey: string, functions: FunctionData[], schemaTreeRoot: SchemaNodeExtended): UnknownNode => {
  if (targetKey.startsWith(mapNodeParams.if)) {
    return findFunctionForFunctionName(mapNodeParams.if, functions);
  }

  const guidLength = 36;
  const dashIndex = targetKey.lastIndexOf('-', targetKey.length - guidLength);
  const destinationFunctionKey = dashIndex === -1 ? targetKey : targetKey.slice(0, dashIndex);
  const destinationFunctionGuid = targetKey.slice(dashIndex + 1);

  const destinationNode = isAGuid(destinationFunctionGuid)
    ? findFunctionForKey(destinationFunctionKey, functions)
    : findNodeForKey(targetKey, schemaTreeRoot, false);

  return destinationNode;
};

export const getDestinationKey = (targetKey: string, destinationNode: UnknownNode): string => {
  if (destinationNode === undefined) {
    return targetKey;
  }

  if (isSchemaNodeExtended(destinationNode)) {
    return `${targetPrefix}${destinationNode?.key}`;
  }

  return targetKey;
};

export const splitKeyIntoChildren = (sourceKey: string): string[] => {
  const functionParams = sourceKey.substring(sourceKey.indexOf('(') + 1, sourceKey.lastIndexOf(')'));

  let openParenthesis = 0;
  let isCustom = false;
  let currentWord = '';
  const results: string[] = [];
  for (let index = 0; index < functionParams.length; index++) {
    const element = functionParams[index];
    if (!isCustom) {
      if (element === '(') {
        openParenthesis++;
        currentWord += element;
      } else if (element === ')') {
        openParenthesis--;
        currentWord += element;
      } else if (element === ',' && openParenthesis === 0) {
        results.push(currentWord.trim());
        currentWord = '';
      } else if (element === '"') {
        isCustom = true;
        currentWord += element;
      } else {
        currentWord += element;
      }
    } else if (element === '"') {
      currentWord += element;
      if (openParenthesis === 0 && functionParams[index + 1] && functionParams[index + 1] === ',') {
        results.push(currentWord.trim());
        currentWord = '';

        // Skip the next comma
        index++;
      }

      isCustom = false;
    } else {
      currentWord += element;
    }
  }

  if (currentWord) {
    results.push(currentWord.trim());
  }

  return results;
};

export const getSourceKeyOfLastLoop = (targetKey: string): string => {
  const forArgs = targetKey.substring(targetKey.lastIndexOf(mapNodeParams.for) + mapNodeParams.for.length + 1, targetKey.lastIndexOf(')'));
  return forArgs.split(',')[0]; // Filter out index variable if any
};

export const Separators = {
  OpenParenthesis: '(',
  CloseParenthesis: ')',
  Comma: ',',
  Dollar: '$',
  //ForwardSlash: '/'
} as const;
export type Separators = (typeof Separators)[keyof typeof Separators];

export const separators: string[] = [Separators.OpenParenthesis, Separators.CloseParenthesis, Separators.Comma, Separators.Dollar];

export const ReservedToken = {
  for: 'for',
  if: 'if',
  backout: '../',
} as const;
export type ReservedToken = (typeof ReservedToken)[keyof typeof ReservedToken];

export const DReservedToken = {
  for: '$for',
  if: '$if',
  backout: '../',
} as const;
export type DReservedToken = (typeof ReservedToken)[keyof typeof ReservedToken];

export const dReservedToken: string[] = [DReservedToken.for, DReservedToken.if, DReservedToken.backout]; // danielle maybe ideally we separate evertything out, so we don't need to change these functions if the definition changes

export const DSeparators = {
  OpenParenthesis: '(',
  CloseParenthesis: ')',
  Comma: ',',
  quote: '"',
} as const;
export type DSeparators = (typeof Separators)[keyof typeof Separators];

export const Dseparators: string[] = [Separators.OpenParenthesis, Separators.CloseParenthesis, Separators.Comma, DSeparators.quote];

export const reservedToken: string[] = [ReservedToken.for, ReservedToken.if, ReservedToken.backout];

export const separateFunctions = (targetKey: string): string[] => {
  const tokens: string[] = [];

  let i = 0;
  let currentToken = '';
  while (i < targetKey.length) {
    const currentChar = targetKey[i];
    if (currentChar === ' ') {
      // ignore whitespace
      i++;
      continue;
    }

    if (Dseparators.includes(currentChar)) {
      if (currentChar === DSeparators.quote) {
        const endOfQuote = targetKey.substring(i + 1).indexOf(DSeparators.quote) + 2 + i;
        tokens.push(targetKey.substring(i, endOfQuote));
        i = endOfQuote;
        continue;
      }
      if (!currentToken) {
        // if it is a Separator
        tokens.push(currentChar);
        i++;
        continue;
      }
      // if it is a function or identifier token
      tokens.push(currentToken);
      currentToken = '';
      tokens.push(currentChar.trim());
      i++;
      continue;
    }

    currentToken = currentToken + currentChar;
    if (dReservedToken.includes(currentToken)) {
      tokens.push(currentToken.trim());
      currentToken = '';
      i++;
      continue;
    }

    if (i === targetKey.length - 1) {
      tokens.push(currentToken.trim());
    }
    i++;
  }
  return tokens;
};

export interface ParseFunc {
  type: 'Function';
  name: string;
  inputs: FunctionCreationMetadata[];
}

export type FunctionCreationMetadata = ParseFunc | SingleValueMetadata;

export type SingleValueMetadata = {
  type: 'SingleValueMetadata';
  specialCharacters?: 'index' | 'customValue' | 'directAccess' | 'loopCurrentNodeDot';
  value: string;
};

const isTokenCustomValue = (value: string): boolean => {
  return value.startsWith('"') || !Number.isNaN(Number.parseInt(value));
};

const currentLoopNodeDot = '.';

export const getSingleValueMetadata = (token: string) => {
  const metadata: SingleValueMetadata = {
    type: 'SingleValueMetadata',
    value: token,
  };
  if (token.startsWith(Separators.Dollar)) {
    metadata.specialCharacters = 'index';
  } else if (token === currentLoopNodeDot) {
    metadata.specialCharacters = 'loopCurrentNodeDot';
  } else if (isTokenCustomValue(token)) {
    metadata.specialCharacters = 'customValue';
  } else if (token.includes('[')) {
    metadata.specialCharacters = 'directAccess';
    // danielle also include separated values here
  } // if it is a loop with backout
  return metadata;
};

// danielle how do we handle this? /ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleId, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration'
export const createSchemaNodeOrFunction = (tokens: string[]): { term: FunctionCreationMetadata; nextIndex: number } => {
  if (tokens.length === 1) {
    const singleValue = getSingleValueMetadata(tokens[0]);
    return { term: singleValue, nextIndex: 2 };
  }
  // determine if token is a function
  if (tokens[1] === Separators.OpenParenthesis) {
    const func: ParseFunc = { type: 'Function', name: tokens[0], inputs: [] };
    if (tokens[0].includes('/')) {
      const singleValue = getSingleValueMetadata(tokens[0]);
      return { term: singleValue, nextIndex: 2 };
    }
    let i = 2; // start of the function inputs
    let parenCount = 1;
    let start = 2;
    while (i < tokens.length && parenCount !== 0) {
      if (tokens[i] === Separators.OpenParenthesis) {
        parenCount++;
      } else if (tokens[i] === Separators.CloseParenthesis && parenCount === 1) {
        if (i === start) {
          // function with no inputs
          return { term: func, nextIndex: i + 1 };
        }
        func.inputs.push(createSchemaNodeOrFunction(tokens.slice(start, i)).term);
        start = i + 2;
        parenCount--;
      } else if (tokens[i] === Separators.CloseParenthesis) {
        parenCount--;
      } else if (tokens[i] !== Separators.Comma) {
        //func.inputs.push(createTargetOrFunction(tokens.slice(i)).term);
      } else if (tokens[i] === Separators.Comma && parenCount === 1) {
        func.inputs.push(createSchemaNodeOrFunction(tokens.slice(start, i)).term);
        start = i + 1;
      }
      i++;
    }
    return { term: func, nextIndex: i + 1 };
  }
  const singleValue = getSingleValueMetadata(tokens[0]);
  return { term: singleValue, nextIndex: 2 };
};

export const qualifyLoopRelativeSourceKeys = (targetKey: string): string => {
  let qualifiedTargetKey = targetKey;

  const srcKeys: string[] = [];
  const splitLoops = qualifiedTargetKey.split(')');
  splitLoops.forEach((splitLoop) => {
    if (splitLoop.includes(mapNodeParams.for)) {
      srcKeys.push(getSourceKeyOfLastLoop(`${splitLoop})`));
    }
  });

  let curSrcParentKey = srcKeys[0];
  srcKeys.forEach((srcKey) => {
    if (!srcKey.includes(curSrcParentKey) && srcKey !== '*') {
      const fullyQualifiedSrcKey = `${curSrcParentKey}/${srcKey}`;
      qualifiedTargetKey = qualifiedTargetKey.replace(`(${srcKey}`, `(${fullyQualifiedSrcKey}`);

      curSrcParentKey = fullyQualifiedSrcKey;
    } else if (srcKey === '*') {
      const fullyQualifiedSrcKey = `${curSrcParentKey}/${srcKey}`;
      qualifiedTargetKey = qualifiedTargetKey.replace('$for(*)', `$for(${fullyQualifiedSrcKey})`);

      curSrcParentKey = fullyQualifiedSrcKey;
    } else {
      curSrcParentKey = srcKey;
    }
  });

  return qualifiedTargetKey;
};

export const getTargetValueWithoutLoops = (targetKey: string, targetArrayDepth: number): string => {
  let result = targetKey;
  const matchedLoops = targetKey.match(/\$for\(((?!\)).)+\)\//g) || [];
  // Start from the bottom and work up
  matchedLoops.reverse();

  matchedLoops.forEach((match, index) => {
    result = result.replace(match, index < targetArrayDepth ? '*/' : '');
  });

  return result;
};

export const getTargetValueWithoutLoopsSchemaSpecific = (targetKey: string, isJsonLoops: boolean): string => {
  let result = targetKey;
  const matchedLoops = targetKey.match(/\$for\(((?!\)).)+\)\//g) || [];
  // Start from the bottom and work up
  matchedLoops.reverse();

  matchedLoops.forEach((match) => {
    result = result.replace(match, isJsonLoops ? '*/' : '');
  });

  return result;
};

export const addParentConnectionForRepeatingElementsNested = (
  sourceNode: SchemaNodeExtended,
  targetNode: SchemaNodeExtended,
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  dataMapConnections: ConnectionDictionary
): boolean => {
  if (sourceNode && sourceNode.parentKey) {
    //danielle temporary to unblock
    const firstTargetNodeWithRepeatingPathItem = findLast(targetNode.pathToRoot, (pathItem) => pathItem.repeating);
    const firstSourceNodeWithRepeatingPathItem = findLast(sourceNode.pathToRoot, (pathItem) => pathItem.repeating);

    if (firstSourceNodeWithRepeatingPathItem && firstTargetNodeWithRepeatingPathItem) {
      const prefixedSourceKey = addReactFlowPrefix(firstSourceNodeWithRepeatingPathItem.key, SchemaType.Source);
      const firstRepeatingSourceNode = flattenedSourceSchema[prefixedSourceKey];
      if (!firstRepeatingSourceNode) {
        return false;
      }

      const prefixedTargetKey = addReactFlowPrefix(firstTargetNodeWithRepeatingPathItem.key, SchemaType.Target);
      const firstRepeatingTargetNode = flattenedTargetSchema[prefixedTargetKey];

      const parentsAlreadyConnected = nodeHasSpecificInputEventually(
        prefixedSourceKey,
        dataMapConnections[prefixedTargetKey],
        dataMapConnections,
        true
      );

      if (!parentsAlreadyConnected) {
        applyConnectionValue(dataMapConnections, {
          targetNode: firstRepeatingTargetNode,
          targetNodeReactFlowKey: prefixedTargetKey,
          findInputSlot: true,
          input: {
            reactFlowKey: prefixedSourceKey,
            node: firstRepeatingSourceNode,
          },
        });
      }

      let nextTargetNode = flattenedTargetSchema[addReactFlowPrefix(firstRepeatingTargetNode.parentKey ?? '', SchemaType.Target)];
      if (!findLast(nextTargetNode.pathToRoot, (pathItem) => pathItem.repeating)) {
        nextTargetNode = firstRepeatingTargetNode;
      }

      const wasNewArrayConnectionAdded = addParentConnectionForRepeatingElementsNested(
        flattenedSourceSchema[addReactFlowPrefix(firstRepeatingSourceNode.parentKey ?? '', SchemaType.Source)],
        nextTargetNode,
        flattenedSourceSchema,
        flattenedTargetSchema,
        dataMapConnections
      );

      return parentsAlreadyConnected ? wasNewArrayConnectionAdded : true;
    }
  }

  return false;
};

export const addNodeToCanvasIfDoesNotExist = (newNode: SchemaNodeExtended, currentCanvasNodes: SchemaNodeExtended[]) => {
  const existingNode = currentCanvasNodes.find((currentNode) => currentNode.key === newNode.key);
  if (existingNode === undefined) {
    currentCanvasNodes.push(newNode);
  }
};

export const addAncestorNodesToCanvas = (
  payloadNode: SchemaNodeExtended,
  currentSourceSchemaNodes: SchemaNodeExtended[],
  flattenedSourceSchema: SchemaNodeDictionary
) => {
  const grandparentNodesOnCanvas = currentSourceSchemaNodes.filter(
    (node) => payloadNode?.key.includes(node.key) && payloadNode.parentKey !== node.key && payloadNode.key !== node.key
  );

  if (grandparentNodesOnCanvas.length > 0) {
    grandparentNodesOnCanvas.sort((a, b) => a.key.length - b.key.length);
    const highestAncestor = grandparentNodesOnCanvas[0];
    payloadNode.pathToRoot.forEach((ancestorNode) => {
      if (ancestorNode.key.length > highestAncestor.key.length && ancestorNode.key !== payloadNode.key) {
        addNodeToCanvasIfDoesNotExist(flattenedSourceSchema[addSourceReactFlowPrefix(ancestorNode.key)], currentSourceSchemaNodes);
      }
    });
  } else {
    const pathToRootWithoutCurrent = payloadNode.pathToRoot.filter((node) => node.key !== payloadNode.key);
    const firstSourceNodeWithRepeatingPathItem = findLast(pathToRootWithoutCurrent, (pathItem) => pathItem.repeating);
    const parentNodeToAdd =
      firstSourceNodeWithRepeatingPathItem && flattenedSourceSchema[addSourceReactFlowPrefix(firstSourceNodeWithRepeatingPathItem.key)];
    if (parentNodeToAdd) {
      addNodeToCanvasIfDoesNotExist(parentNodeToAdd, currentSourceSchemaNodes);
    }
  }
};

// TODO JSON deserialization with the array type
export const flattenMapDefinitionValues = (node: MapDefinitionEntry | MapDefinitionEntry[]): string[] => {
  return Object.values(node).flatMap((nodeValue) => {
    if (typeof nodeValue === 'string') {
      return [nodeValue];
    }
    return flattenMapDefinitionValues(nodeValue);
  });
};

export const extractScopeFromLoop = (scope: string): string | undefined => scope.match(/.*\(([^,]*),+/)?.[1];

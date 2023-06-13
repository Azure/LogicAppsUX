import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import { SchemaType } from '../models';
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
import { isAGuid } from '@microsoft/utils-logic-apps';

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
          } else if (isSchemaNodeExtended(input.node)) {
            return shouldLocalizePaths && input.node.qName.startsWith('@') ? `./${input.node.key}` : input.node.key;
          } else {
            if (input.node.key === indexPseudoFunctionKey) {
              return getIndexValueForCurrentConnection(connections[input.reactFlowKey], connections);
            } else if (input.node.key.startsWith(directAccessPseudoFunctionKey)) {
              const functionValues = getInputValues(connections[input.reactFlowKey], connections, false);
              return formatDirectAccess(functionValues[0], functionValues[1], functionValues[2]);
            } else {
              return collectFunctionValue(input.node, connections[input.reactFlowKey], connections, shouldLocalizePaths);
            }
          }
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

  const allRequiredInputsFilledOut = connectionsArray.every(([_key, targetConnection]) => {
    const selfNode = targetConnection.self.node;
    if (isFunctionData(selfNode)) {
      return selfNode.inputs.every((nodeInput, index) => {
        return nodeInput.isOptional || targetConnection.inputs[index].length > 0;
      });
    }

    return true;
  });

  // Is valid to generate the map definition
  return allNodesTerminateIntoSource && allRequiredInputsFilledOut;
};

export const amendSourceKeyForDirectAccessIfNeeded = (sourceKey: string): [string, string] => {
  // Parse the outermost Direct Access (if present) into the typical Function format
  let mockDirectAccessFnKey: string | undefined = undefined;
  const [daOpenBracketIdx, daClosedBracketIdx] = [sourceKey.indexOf('['), sourceKey.lastIndexOf(']')];
  if (daOpenBracketIdx > -1 && daClosedBracketIdx > -1) {
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

    mockDirectAccessFnKey = `${directAccessPseudoFunctionKey}(`;
    mockDirectAccessFnKey += `${sourceKey.substring(daOpenBracketIdx + 1, daClosedBracketIdx)}, `; // Index value
    mockDirectAccessFnKey += `${sourceKey.substring(keyWithDaStartIdx, daOpenBracketIdx)}, `; // Scope (source loop element)
    mockDirectAccessFnKey += `${sourceKey.substring(keyWithDaStartIdx, daOpenBracketIdx)}${sourceKey.substring(
      daClosedBracketIdx + 1,
      keyWithDaEndIdx
    )}`; // Output value
    mockDirectAccessFnKey += ')';

    return [
      sourceKey.substring(0, keyWithDaStartIdx) + mockDirectAccessFnKey + sourceKey.substring(keyWithDaEndIdx),
      mockDirectAccessFnKey,
    ];
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
  } else if (sourceKey.startsWith(directAccessPseudoFunctionKey)) {
    return directAccessPseudoFunction;
  } else if (
    (sourceKey.startsWith(ifPseudoFunctionKey) && sourceKey.charAt(ifPseudoFunctionKey.length) === '(') ||
    isIfAndGuid(sourceKey)
  ) {
    // We don't want if-else to be caught here
    // eslint-disable-next-line no-param-reassign
    createdNodes[sourceKey] = sourceKey;
    return ifPseudoFunction;
  } else if (endOfFunctionIndex > -1) {
    // We found a Function in source key -> let's find its data
    return findFunctionForFunctionName(sourceKey.substring(0, endOfFunctionIndex), functions);
  } else {
    return findNodeForKey(sourceKey, sourceSchema.schemaTreeRoot);
  }
};

export const getDestinationNode = (targetKey: string, functions: FunctionData[], schemaTreeRoot: SchemaNodeExtended): UnknownNode => {
  if (targetKey.startsWith(mapNodeParams.if)) {
    return findFunctionForFunctionName(mapNodeParams.if, functions);
  }

  const dashIndex = targetKey.indexOf('-');
  const destinationFunctionKey = dashIndex === -1 ? targetKey : targetKey.slice(0, dashIndex);
  const destinationFunctionGuid = targetKey.slice(dashIndex + 1);

  const destinationNode = isAGuid(destinationFunctionGuid)
    ? findFunctionForKey(destinationFunctionKey, functions)
    : findNodeForKey(targetKey, schemaTreeRoot);

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
    } else {
      if (element === '"') {
        currentWord += element;
        if (functionParams[index + 1] && functionParams[index + 1] === ',') {
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

export const getSourceValueFromLoop = (sourceKey: string, targetKey: string, sourceSchemaFlattened: SchemaNodeDictionary): string => {
  let constructedSourceKey = sourceKey;
  const srcKeyWithinFor = getSourceKeyOfLastLoop(qualifyLoopRelativeSourceKeys(targetKey));

  // Deserialize dot accessors as their parent loop's source node
  if (constructedSourceKey === '.') {
    return srcKeyWithinFor;
  } else {
    let idxOfDotAccess = constructedSourceKey.indexOf('.');
    while (idxOfDotAccess > -1) {
      const preChar = constructedSourceKey[idxOfDotAccess - 1];
      const postChar = constructedSourceKey[idxOfDotAccess + 1];

      // Make sure the input is just '.'
      let newStartIdx = idxOfDotAccess + 1;
      if ((preChar === '(' || preChar === ' ') && (postChar === ')' || postChar === ',')) {
        constructedSourceKey =
          constructedSourceKey.substring(0, idxOfDotAccess) + srcKeyWithinFor + constructedSourceKey.substring(idxOfDotAccess + 1);
        newStartIdx += srcKeyWithinFor.length;
      }

      idxOfDotAccess = constructedSourceKey.indexOf('.', newStartIdx);
    }
  }

  const relativeSrcKeyArr = sourceKey
    .split(', ')
    .map((keyChunk) => {
      let modifiedKeyChunk = keyChunk;

      // Functions with no inputs
      if (modifiedKeyChunk.includes('()')) {
        return '';
      }

      // Will only ever be one or zero '(' after splitting on commas
      const openParenIdx = modifiedKeyChunk.lastIndexOf('(');
      if (openParenIdx >= 0) {
        modifiedKeyChunk = modifiedKeyChunk.substring(openParenIdx + 1);
      }

      // Should only ever be one or zero ')' after ruling out substrings w/ functions w/ no inputs
      modifiedKeyChunk = modifiedKeyChunk.replaceAll(')', '');

      return modifiedKeyChunk;
    })
    .filter((keyChunk) => keyChunk !== '');

  if (relativeSrcKeyArr.length > 0) {
    relativeSrcKeyArr.forEach((relativeKeyMatch) => {
      if (!relativeKeyMatch.includes(srcKeyWithinFor)) {
        // Replace './' to deal with relative attribute paths
        const fullyQualifiedSourceKey = `${srcKeyWithinFor}/${relativeKeyMatch.replace('./', '')}`;
        const isValidSrcNode = !!sourceSchemaFlattened[`${sourcePrefix}${fullyQualifiedSourceKey}`];

        constructedSourceKey = isValidSrcNode
          ? constructedSourceKey.replace(relativeKeyMatch, fullyQualifiedSourceKey)
          : constructedSourceKey;
      }
    });
  } else {
    const fullyQualifiedSourceKey = `${srcKeyWithinFor}/${sourceKey}`;
    constructedSourceKey = sourceSchemaFlattened[`${sourcePrefix}${fullyQualifiedSourceKey}`] ? fullyQualifiedSourceKey : sourceKey;
  }

  return constructedSourceKey;
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
      qualifiedTargetKey = qualifiedTargetKey.replace(srcKey, fullyQualifiedSrcKey);

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

export const addParentConnectionForRepeatingElementsNested = (
  sourceNode: SchemaNodeExtended,
  targetNode: SchemaNodeExtended,
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  dataMapConnections: ConnectionDictionary
): boolean => {
  if (sourceNode.parentKey) {
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

      return !parentsAlreadyConnected ? true : wasNewArrayConnectionAdded;
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
    } else {
      return flattenMapDefinitionValues(nodeValue);
    }
  });
};

export const extractScopeFromLoop = (scope: string): string | undefined => scope.match(/.*\(([^,]*),+/)?.[1];

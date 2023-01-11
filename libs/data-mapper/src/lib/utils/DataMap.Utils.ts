import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { MapDefinitionEntry, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import { SchemaType } from '../models';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import { ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import { findLast } from './Array.Utils';
import {
  flattenInputs,
  isCustomValue,
  nodeHasSourceNodeEventually,
  nodeHasSpecificInputEventually,
  setConnectionInputValue,
} from './Connection.Utils';
import { findFunctionForFunctionName, findFunctionForKey, getIndexValueForCurrentConnection, isFunctionData } from './Function.Utils';
import { addReactFlowPrefix } from './ReactFlow.Util';
import { findNodeForKey, isSchemaNodeExtended } from './Schema.Utils';
import { isAGuid } from '@microsoft/utils-logic-apps';

type UnknownNode = SchemaNodeExtended | FunctionData | undefined;

export const getParentId = (id: string): string => {
  const last = id.lastIndexOf('/');
  return id.substring(0, last);
};

export const getInputValues = (currentConnection: Connection | undefined, connections: ConnectionDictionary): string[] => {
  return currentConnection
    ? (flattenInputs(currentConnection.inputs)
        .flatMap((input) => {
          if (!input) {
            return undefined;
          }

          if (isCustomValue(input)) {
            return input;
          } else if (isSchemaNodeExtended(input.node)) {
            return input.node.key.startsWith('@') ? `$${input.node.key}` : input.node.key;
          } else {
            if (input.node.key === indexPseudoFunctionKey) {
              return getIndexValueForCurrentConnection(connections[input.reactFlowKey]);
            } else {
              return collectFunctionValue(input.node, connections[input.reactFlowKey], connections);
            }
          }
        })
        .filter((mappedInput) => !!mappedInput) as string[])
    : [];
};

const combineFunctionAndInputs = (functionData: FunctionData, inputs: string[]): string => {
  return `${functionData.functionName}(${inputs.join(', ')})`;
};

export const collectFunctionValue = (node: FunctionData, currentConnection: Connection, connections: ConnectionDictionary): string => {
  // Special case where the index is used directly
  if (currentConnection.self.node.key === indexPseudoFunctionKey) {
    return getIndexValueForCurrentConnection(currentConnection);
  }

  const inputValues = getInputValues(currentConnection, connections);

  // Special case for conditionals
  if (currentConnection.self.node.key === ifPseudoFunctionKey) {
    return inputValues[0];
  }

  return combineFunctionAndInputs(node, inputValues);
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

export const getSourceLoopKey = (targetKey: string): string => {
  const forArgs = targetKey.substring(targetKey.lastIndexOf(mapNodeParams.for) + mapNodeParams.for.length + 1, targetKey.lastIndexOf(')'));
  return forArgs.split(',')[0]; // Filter out index variable if any
};

export const getSourceValueFromLoop = (sourceKey: string, targetKey: string, sourceSchemaFlattened: SchemaNodeDictionary): string => {
  let constructedSourceKey = sourceKey;
  const srcKeyWithinFor = getSourceLoopKey(targetKey);

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
        const fullyQualifiedSourceKey = `${srcKeyWithinFor}/${relativeKeyMatch}`;
        constructedSourceKey = constructedSourceKey.replace(
          relativeKeyMatch,
          sourceSchemaFlattened[`${sourcePrefix}${fullyQualifiedSourceKey}`] ? fullyQualifiedSourceKey : relativeKeyMatch
        );
      }
    });
  } else {
    const fullyQualifiedSourceKey = `${srcKeyWithinFor}/${sourceKey}`;
    constructedSourceKey = sourceSchemaFlattened[`${sourcePrefix}${fullyQualifiedSourceKey}`] ? fullyQualifiedSourceKey : sourceKey;
  }
  return constructedSourceKey;
};

export const getTargetValueWithoutLoop = (targetKey: string): string => {
  const forMatchArr = targetKey.match(/\$for\(((?!\)).)+\)\//g);
  const forMatch = forMatchArr?.[forMatchArr.length - 1];
  return forMatch ? targetKey.replace(forMatch, '') : targetKey;
};

export const addParentConnectionForRepeatingElementsNested = (
  sourceNode: SchemaNodeExtended,
  targetNode: SchemaNodeExtended,
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  dataMapConnections: ConnectionDictionary
) => {
  if (sourceNode.parentKey) {
    const firstTargetNodeWithRepeatingPathItem = findLast(targetNode.pathToRoot, (pathItem) => pathItem.repeating);
    const firstSourceNodeWithRepeatingPathItem = findLast(sourceNode.pathToRoot, (pathItem) => pathItem.repeating);

    if (firstSourceNodeWithRepeatingPathItem && firstTargetNodeWithRepeatingPathItem) {
      const prefixedSourceKey = addReactFlowPrefix(firstSourceNodeWithRepeatingPathItem.key, SchemaType.Source);
      const firstRepeatingSourceNode = flattenedSourceSchema[prefixedSourceKey];
      if (!firstRepeatingSourceNode) {
        return;
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
        setConnectionInputValue(dataMapConnections, {
          targetNode: firstRepeatingTargetNode,
          targetNodeReactFlowKey: prefixedTargetKey,
          findInputSlot: true,
          value: {
            reactFlowKey: prefixedSourceKey,
            node: firstRepeatingSourceNode,
          },
        });
      }

      let nextTargetNode = flattenedTargetSchema[addReactFlowPrefix(firstRepeatingTargetNode.parentKey ?? '', SchemaType.Target)];
      if (!findLast(nextTargetNode.pathToRoot, (pathItem) => pathItem.repeating)) {
        nextTargetNode = firstRepeatingTargetNode;
      }

      addParentConnectionForRepeatingElementsNested(
        flattenedSourceSchema[addReactFlowPrefix(firstRepeatingSourceNode.parentKey ?? '', SchemaType.Source)],
        nextTargetNode,
        flattenedSourceSchema,
        flattenedTargetSchema,
        dataMapConnections
      );
    }
  }
};

export const flattenMapDefinitionValues = (node: MapDefinitionEntry): string[] => {
  return Object.values(node).flatMap((nodeValue) => {
    if (typeof nodeValue === 'string') {
      return [nodeValue];
    } else {
      return flattenMapDefinitionValues(nodeValue);
    }
  });
};

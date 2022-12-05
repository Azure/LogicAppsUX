/* eslint-disable no-param-reassign */
import {
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements } from '../core/state/DataMapSlice';
import type { Connection, ConnectionDictionary, InputConnection } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import { directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeProperty, SchemaType } from '../models/Schema';
import { findLast } from './Array.Utils';
import {
  addNodeToConnections,
  collectTargetNodesForConnectionChain,
  flattenInputs,
  isConnectionUnit,
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
} from './Function.Utils';
import { addReactFlowPrefix, addTargetReactFlowPrefix, createReactFlowFunctionKey } from './ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary, isSchemaNodeExtended } from './Schema.Utils';
import { isAGuid } from '@microsoft/utils-logic-apps';
import yaml from 'js-yaml';

interface OutputPathItem {
  key: string;
  value?: string;
}

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined
): string => {
  if (sourceSchema && targetSchema && isValidToMakeMapDefinition(connections)) {
    const mapDefinition: MapDefinitionEntry = {};

    generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    generateMapDefinitionBody(mapDefinition, connections);

    return yaml.dump(mapDefinition, { quotingType: '"', replacer: yamlReplacer }).replaceAll('\\"', '');
  }

  return '';
};

// Exported for testing purposes
export const generateMapDefinitionHeader = (
  mapDefinition: MapDefinitionEntry,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): void => {
  mapDefinition[reservedMapDefinitionKeys.version] = mapDefinitionVersion;
  mapDefinition[reservedMapDefinitionKeys.sourceFormat] = sourceSchema.type;
  mapDefinition[reservedMapDefinitionKeys.targetFormat] = targetSchema.type;
  mapDefinition[reservedMapDefinitionKeys.sourceSchemaName] = sourceSchema.name;
  mapDefinition[reservedMapDefinitionKeys.targetSchemaName] = targetSchema.name;

  if (sourceSchema.namespaces && Object.keys(sourceSchema.namespaces).length > 0) {
    mapDefinition[reservedMapDefinitionKeys.sourceNamespaces] = sourceSchema.namespaces;
  }

  if (targetSchema.namespaces && Object.keys(targetSchema.namespaces).length > 0) {
    mapDefinition[reservedMapDefinitionKeys.targetNamespaces] = targetSchema.namespaces;
  }
};

export const getParentId = (id: string): string => {
  const last = id.lastIndexOf('/');
  return id.substring(0, last);
};

// Exported for testing purposes
export const generateMapDefinitionBody = (mapDefinition: MapDefinitionEntry, connections: ConnectionDictionary): void => {
  // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
  const targetSchemaConnections = Object.entries(connections).filter(([key, connection]) => {
    const selfNode = connection.self.node;
    if (key.startsWith(targetPrefix) && isSchemaNodeExtended(selfNode)) {
      return selfNode.nodeProperties.every((property) => property !== SchemaNodeProperty.Repeating);
    } else {
      return false;
    }
  });
  targetSchemaConnections.forEach(([_key, connection]) => {
    const flattenedInputs = flattenInputs(connection.inputs);
    flattenedInputs.forEach((input) => {
      const selfNode = connection.self.node;
      if (input && isSchemaNodeExtended(selfNode)) {
        const pathToCreate = createNewPathItems(input, selfNode, connections);
        applyValueAtPath(mapDefinition, pathToCreate);
      }
    });
  });
};

const createNewPathItems = (input: InputConnection, targetNode: SchemaNodeExtended, connections: ConnectionDictionary) => {
  const newPath: OutputPathItem[] = [];
  const isObjectValue = targetNode.nodeProperties.some((property) => property === SchemaNodeProperty.ComplexTypeSimpleContent);

  targetNode.pathToRoot.forEach((pathItem, index, array) => {
    const rootTargetConnection = connections[addTargetReactFlowPrefix(pathItem.key)];

    // If there is no rootTargetConnection that means there is a looping node in the source structure, but we aren't using it
    // Probably used for direct index access
    if (pathItem.repeating && rootTargetConnection) {
      // Looping schema node
      addLoopingToNewPathItems(pathItem, rootTargetConnection, connections, newPath);
    } else {
      if (rootTargetConnection) {
        // Conditionals
        const rootSourceNodes = rootTargetConnection.inputs[0];
        const sourceNode = rootSourceNodes[0];
        if (sourceNode && isConnectionUnit(sourceNode) && sourceNode.node.key.startsWith(ifPseudoFunctionKey)) {
          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
        }
      }

      if (index + 1 < array.length) {
        // Still have objects to traverse down
        newPath.push({ key: pathItem.fullName.startsWith('@') ? `$${pathItem.fullName}` : pathItem.fullName });
      } else {
        // Add the actual connection value now that we're at the correct spot
        let value = '';
        if (input) {
          if (isCustomValue(input)) {
            value = input;
          } else if (isSchemaNodeExtended(input.node)) {
            value = input.node.key;
          } else {
            if (input.node.key.startsWith(ifPseudoFunctionKey)) {
              const values = collectConditionalValues(connections[input.reactFlowKey], connections);
              value = values[1];
            } else if (input.node.key.startsWith(directAccessPseudoFunctionKey)) {
              const functionValues = getInputValues(connections[input.reactFlowKey], connections);
              value = formatDirectAccess(functionValues[0], functionValues[1], functionValues[2]);
            } else {
              value = collectFunctionValue(input.node, connections[input.reactFlowKey], connections);
            }
          }
        }

        const rootTargetConnection = connections[addTargetReactFlowPrefix(pathItem.key)];
        const rootSourceNodes = rootTargetConnection.inputs[0];
        const sourceNode = rootSourceNodes[0];
        if (sourceNode && isConnectionUnit(sourceNode)) {
          if (isFunctionData(sourceNode.node)) {
            const latestLoopKey = findLast(newPath, (pathItem) => pathItem.key.startsWith(mapNodeParams.for))?.key;
            if (latestLoopKey) {
              // Need local variables for functions
              const splitLoopKey = latestLoopKey.split(',');
              const valueToTrim = splitLoopKey[0].substring(
                mapNodeParams.for.length + 1,
                splitLoopKey.length === 2 ? splitLoopKey[0].length : splitLoopKey[0].length - 1
              );

              if (value === valueToTrim) {
                value = '';
              } else {
                value = value.replaceAll(`${valueToTrim}/`, '');
              }
            }
          } else {
            // Need local variables for non-functions
            const valueToTrim = findLast(sourceNode.node.pathToRoot, (pathItem) => pathItem.repeating && pathItem.key !== value)?.key;
            if (valueToTrim) {
              value = value.replace(`${valueToTrim}/`, '');
            }

            value = value.startsWith('@') ? `./${value}` : value;
          }
        }

        if (isObjectValue) {
          // $Value
          newPath.push({ key: pathItem.fullName.startsWith('@') ? `$${pathItem.fullName}` : pathItem.fullName });
          newPath.push({ key: mapNodeParams.value, value });
        } else {
          // Standard property to value
          newPath.push({
            key: isObjectValue ? mapNodeParams.value : pathItem.fullName.startsWith('@') ? `$${pathItem.fullName}` : pathItem.fullName,
            value: value ? value : undefined,
          });
        }
      }
    }
  });

  return newPath;
};

const addConditionalToNewPathItems = (ifConnection: Connection, connections: ConnectionDictionary, newPath: OutputPathItem[]) => {
  const values = collectConditionalValues(ifConnection, connections);

  let ifContents = values[0];
  const latestLoopKey = findLast(newPath, (pathItem) => pathItem.key.startsWith(mapNodeParams.for))?.key;
  if (latestLoopKey) {
    // Need local variables for functions
    const splitLoopKey = latestLoopKey.split(',');
    const valueToTrim = splitLoopKey[0].substring(
      mapNodeParams.for.length + 1,
      splitLoopKey.length === 2 ? splitLoopKey[0].length : splitLoopKey[0].length - 1
    );

    ifContents = ifContents.replaceAll(`${valueToTrim}/`, '');
  }

  // If entry
  newPath.push({ key: `${mapNodeParams.if}(${ifContents})` });
};

const addLoopingToNewPathItems = (
  pathItem: PathItem,
  rootTargetConnection: Connection,
  connections: ConnectionDictionary,
  newPath: OutputPathItem[]
) => {
  const rootSourceNodes = [...rootTargetConnection.inputs[0]];
  rootSourceNodes.sort((nodeA, nodeB) => {
    if (isConnectionUnit(nodeA) && isConnectionUnit(nodeB)) {
      return nodeA.reactFlowKey.localeCompare(nodeB.reactFlowKey);
    }
    return 0;
  });

  rootSourceNodes.forEach((sourceNode) => {
    let loopValue = '';
    if (sourceNode && isConnectionUnit(sourceNode)) {
      if (isFunctionData(sourceNode.node)) {
        if (sourceNode.node.key === ifPseudoFunctionKey) {
          const sourceSchemaNodeConnection = connections[sourceNode.reactFlowKey].inputs[1][0];
          const [sourceSchemaNodeReactFlowKey, sourceSchemaNodeKey] = (isConnectionUnit(sourceSchemaNodeConnection) && [
            sourceSchemaNodeConnection.reactFlowKey,
            sourceSchemaNodeConnection.node.key,
          ]) || ['', ''];

          const indexFunctions = collectTargetNodesForConnectionChain(connections[sourceSchemaNodeReactFlowKey], connections).filter(
            (connection) => connection.node.key === indexPseudoFunctionKey
          );

          if (indexFunctions.length > 0) {
            loopValue = `${mapNodeParams.for}(${sourceSchemaNodeKey}, ${getIndexValueForCurrentConnection(
              connections[indexFunctions[0].reactFlowKey]
            )})`;
          } else {
            loopValue = `${mapNodeParams.for}(${loopValue})`;
          }

          // For entry
          newPath.push({ key: loopValue });

          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
        } else {
          // Loop with an index
          const indexFunctionKey = sourceNode.reactFlowKey;
          const sourceSchemaNodeConnection = connections[indexFunctionKey].inputs[0][0];
          const sourceSchemaNodeKey = (isConnectionUnit(sourceSchemaNodeConnection) && sourceSchemaNodeConnection.node.key) || '';
          const indexFunctionInput = connections[indexFunctionKey];

          loopValue = `${mapNodeParams.for}(${sourceSchemaNodeKey}, ${getIndexValueForCurrentConnection(indexFunctionInput)})`;

          // For entry
          newPath.push({ key: loopValue });
        }
      } else {
        // Normal loop
        loopValue = sourceNode.node.key;
        const valueToTrim = findLast(sourceNode.node.pathToRoot, (pathItem) => pathItem.repeating && pathItem.key !== loopValue)?.key;
        if (valueToTrim) {
          loopValue = loopValue.replace(`${valueToTrim}/`, '');
        }

        loopValue = `${mapNodeParams.for}(${loopValue})`;

        // For entry
        newPath.push({ key: loopValue });
      }
    }
  });

  // Object within the loop
  newPath.push({ key: pathItem.fullName.startsWith('@') ? `$${pathItem.fullName}` : pathItem.fullName });
};

const applyValueAtPath = (mapDefinition: MapDefinitionEntry, path: OutputPathItem[]) => {
  path.forEach((pathItem) => {
    if (!mapDefinition[pathItem.key]) {
      mapDefinition[pathItem.key] = {};
    }

    if (pathItem.value) {
      mapDefinition[pathItem.key] = pathItem.value;
    }

    mapDefinition = mapDefinition[pathItem.key] as MapDefinitionEntry;
  });
};

const collectFunctionValue = (node: FunctionData, currentConnection: Connection, connections: ConnectionDictionary): string => {
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

const collectConditionalValues = (currentConnection: Connection, connections: ConnectionDictionary): [string, string] => {
  const inputValues = getInputValues(currentConnection, connections);

  return [inputValues[0], inputValues[1]];
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

/* Deserialize yml */
export const convertFromMapDefinition = (
  mapDefinition: MapDefinitionEntry,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  functions: FunctionData[]
): ConnectionDictionary => {
  const connections: ConnectionDictionary = {};
  const parsedYamlKeys: string[] = Object.keys(mapDefinition);

  const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

  if (rootNodeKey) {
    parseDefinitionToConnection(mapDefinition[rootNodeKey], `/${rootNodeKey}`, connections, {}, sourceSchema, targetSchema, functions);
  }
  return connections;
};

const parseDefinitionToConnection = (
  sourceNodeObject: string | object | any,
  targetKey: string,
  connections: ConnectionDictionary,
  createdNodes: { [completeFunction: string]: string },
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  functions: FunctionData[]
) => {
  if (typeof sourceNodeObject === 'string') {
    const sourceEndOfFunction = sourceNodeObject.indexOf('(');
    const amendedSourceKey = targetKey.includes(mapNodeParams.for) ? getSourceValueFromLoop(sourceNodeObject, targetKey) : sourceNodeObject;

    const sourceNode =
      sourceEndOfFunction > -1
        ? findFunctionForFunctionName(amendedSourceKey.substring(0, sourceEndOfFunction), functions)
        : findNodeForKey(amendedSourceKey, sourceSchema.schemaTreeRoot);
    const sourceKey =
      sourceNode && isFunctionData(sourceNode)
        ? createdNodes[amendedSourceKey]
          ? createdNodes[amendedSourceKey]
          : createReactFlowFunctionKey(sourceNode)
        : `${sourcePrefix}${amendedSourceKey}`;
    createdNodes[amendedSourceKey] = sourceKey;

    const destinationFunctionKey = targetKey.slice(0, targetKey.indexOf('-'));
    const destinationFunctionGuid = targetKey.slice(targetKey.indexOf('-') + 1);
    const destinationNode = isAGuid(destinationFunctionGuid)
      ? findFunctionForKey(destinationFunctionKey, functions)
      : findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const destinationKey = isAGuid(destinationFunctionGuid) ? targetKey : `${targetPrefix}${destinationNode?.key}`;

    if (targetKey.includes(mapNodeParams.for)) {
      // if has for, add parent connection
      const sourceFlattened = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const targetFlattened = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);
      if (sourceNode && destinationNode) {
        addParentConnectionForRepeatingElements(
          destinationNode as SchemaNodeExtended,
          sourceNode as SchemaNodeExtended,
          sourceFlattened,
          targetFlattened,
          connections
        ); // danielle fix typing
      }
    }

    if (sourceNode && destinationNode) {
      addNodeToConnections(connections, sourceNode, sourceKey, destinationNode, destinationKey);
    }

    // Need to extract and create connections for nested functions
    if (sourceEndOfFunction > -1) {
      const childFunctions = splitKeyIntoChildren(sourceNodeObject);

      childFunctions.forEach((childFunction) => {
        parseDefinitionToConnection(childFunction, sourceKey, connections, createdNodes, sourceSchema, targetSchema, functions);
      });
    }

    return;
  }

  for (const childKey in sourceNodeObject) {
    if (childKey !== mapNodeParams.value) {
      parseDefinitionToConnection(
        sourceNodeObject[childKey],
        `${targetKey}/${childKey}`,
        connections,
        createdNodes,
        sourceSchema,
        targetSchema,
        functions
      );
    }
  }
};

// Exported for testing purposes only
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

const yamlReplacer = (key: string, value: any) => {
  if (typeof value === 'string') {
    if (key === reservedMapDefinitionKeys.version) {
      return parseFloat(value);
    }
  }

  return value;
};

export const getSourceValueFromLoop = (sourceKey: string, targetKey: string): string => {
  let constructedSourceKey = '';
  const matchArr = targetKey.match(/\$for\([^)]+\)\//g);
  let match = matchArr?.[matchArr.length - 1];
  match = match?.replace('$for(', '');
  match = match?.replace(')', '');
  const endOfLastFunctionIndex = sourceKey.lastIndexOf('(');
  if (endOfLastFunctionIndex > 0) {
    constructedSourceKey =
      sourceKey.substring(0, sourceKey.lastIndexOf('(') + 1) +
      match +
      sourceKey.substring(sourceKey.lastIndexOf('(') + 1, sourceKey.length + 1);
  } else {
    constructedSourceKey = match + sourceKey;
  }
  return constructedSourceKey;
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
        addNodeToConnections(dataMapConnections, firstRepeatingSourceNode, prefixedSourceKey, firstRepeatingTargetNode, prefixedTargetKey);
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

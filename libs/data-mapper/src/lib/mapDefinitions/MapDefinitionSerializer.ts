/* eslint-disable no-param-reassign */
import { mapDefinitionVersion, mapNodeParams, reservedMapDefinitionKeys } from '../constants/MapDefinitionConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary, InputConnection } from '../models/Connection';
import { directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { NormalizedDataType, SchemaNodeProperty } from '../models/Schema';
import { findLast } from '../utils/Array.Utils';
import { collectTargetNodesForConnectionChain, flattenInputs, isConnectionUnit, isCustomValue } from '../utils/Connection.Utils';
import { collectConditionalValues, collectFunctionValue, getInputValues, isValidToMakeMapDefinition } from '../utils/DataMap.Utils';
import { formatDirectAccess, getIndexValueForCurrentConnection, isFunctionData } from '../utils/Function.Utils';
import { LogCategory, LogService } from '../utils/Logging.Utils';
import { addTargetReactFlowPrefix } from '../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../utils/Schema.Utils';
import yaml from 'js-yaml';

interface OutputPathItem {
  key: string;
  value?: string;
}

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined,
  generateHeader = true
): string => {
  if (sourceSchema && targetSchema && isValidToMakeMapDefinition(connections)) {
    console.log('---------------------------BEGIN----------------------');
    const mapDefinition: MapDefinitionEntry = {};

    if (generateHeader) {
      generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    }

    generateMapDefinitionBody(mapDefinition, connections);

    return yaml.dump(mapDefinition, { quotingType: '"', replacer: yamlReplacer }).replaceAll('\\"', '');
  }

  return '';
};

const yamlReplacer = (key: string, value: any) => {
  if (typeof value === 'string') {
    if (key === reservedMapDefinitionKeys.version) {
      return parseFloat(value);
    }
  }

  return value;
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
            value: value && targetNode.normalizedDataType !== NormalizedDataType.ComplexType ? value : undefined,
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
      let nodeAToUse = nodeA;
      let nodeBToUse = nodeB;

      // If we are using indices, we want to instead sort off of the schema node, not the index
      // That way if we have layered index pseudo functions they are sorted correctly
      if (nodeA.node.key === indexPseudoFunctionKey) {
        const sourceInput = connections[nodeA.reactFlowKey].inputs[0][0];
        if (isConnectionUnit(sourceInput)) {
          nodeAToUse = sourceInput;
        }
      }

      if (nodeB.node.key === indexPseudoFunctionKey) {
        const sourceInput = connections[nodeB.reactFlowKey].inputs[0][0];
        if (isConnectionUnit(sourceInput)) {
          nodeBToUse = sourceInput;
        }
      }

      return nodeAToUse.reactFlowKey.localeCompare(nodeBToUse.reactFlowKey);
    }
    return 0;
  });

  rootSourceNodes.forEach((sourceNode) => {
    console.log('SOURCE NODE: ', sourceNode);
    let loopValue = '';
    if (sourceNode && isConnectionUnit(sourceNode)) {
      if (isFunctionData(sourceNode.node)) {
        if (sourceNode.node.key === ifPseudoFunctionKey) {
          const sourceSchemaNodeConnection = connections[sourceNode.reactFlowKey].inputs[1][0];
          const sourceSchemaNodeReactFlowKey =
            (isConnectionUnit(sourceSchemaNodeConnection) && sourceSchemaNodeConnection.reactFlowKey) || '';

          const indexFunctions = collectTargetNodesForConnectionChain(connections[sourceSchemaNodeReactFlowKey], connections).filter(
            (connection) => connection.node.key === indexPseudoFunctionKey
          );

          if (indexFunctions.length > 0) {
            const indexConnection = connections[indexFunctions[0].reactFlowKey];
            const inputConnection = indexConnection.inputs[0][0];
            const inputKey = isConnectionUnit(inputConnection) && inputConnection.node.key;

            loopValue = `${mapNodeParams.for}(${inputKey}, ${getIndexValueForCurrentConnection(indexConnection)})`;
          } else {
            loopValue = `${mapNodeParams.for}(${loopValue})`;
          }

          // For entry
          newPath.push({ key: loopValue });

          console.log('HERE1', loopValue, newPath);

          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
        } else {
          // Loop with an index
          const indexFunctionKey = sourceNode.reactFlowKey;
          const sourceSchemaNodeConnection = connections[indexFunctionKey].inputs[0][0];
          const sourceSchemaNode = isConnectionUnit(sourceSchemaNodeConnection) && sourceSchemaNodeConnection.node;
          const indexFunctionInput = connections[indexFunctionKey];

          if (sourceSchemaNode && isSchemaNodeExtended(sourceSchemaNode)) {
            const valueToTrim = findLast(
              sourceSchemaNode.pathToRoot,
              (pathItem) => pathItem.repeating && pathItem.key !== sourceSchemaNode.key
            )?.key;
            loopValue = sourceSchemaNode.key.replace(`${valueToTrim}/`, '');
            loopValue = `${mapNodeParams.for}(${loopValue}, ${getIndexValueForCurrentConnection(indexFunctionInput)})`;
          } else {
            LogService.error(LogCategory.DataMapUtils, 'addLoopingToNewPathItems', {
              message: `Failed to generate proper loopValue: ${loopValue}`,
            });
          }

          // For entry
          newPath.push({ key: loopValue });
          console.log('HERE2', loopValue, newPath);
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
        console.log('HERE3', loopValue, newPath);
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

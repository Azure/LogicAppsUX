/* eslint-disable no-param-reassign */
import { mapDefinitionVersion, mapNodeParams, reservedMapDefinitionKeys } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary, NodeConnection, InputConnection } from '../models/Connection';
import { directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import { findLast } from '../utils/Array.Utils';
import {
  collectTargetNodesForConnectionChain,
  isNodeConnection,
  isCustomValueConnection,
  isEmptyConnection,
  connectionDoesExist,
} from '../utils/Connection.Utils';
import {
  collectConditionalValues,
  collectFunctionValue,
  collectSequenceValue,
  extractScopeFromLoop,
  getInputValues,
  getSourceKeyOfLastLoop,
} from '../utils/DataMap.Utils';
import { formatDirectAccess, getIndexValueForCurrentConnection, isFunctionData } from '../utils/Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from '../utils/ReactFlow.Util';
import { isObjectType, isSchemaNodeExtended } from '../utils/Schema.Utils';
import type { MapDefinitionEntry, MapDefinitionValue, PathItem, SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { extend, guid, isAGuid, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import yaml from 'js-yaml';

interface OutputPathItem {
  key: string;
  value?: string;
  arrayIndex?: number;
}

export type MetaMapDefinition = FailedMapDefinition | SuccessfulMapDefinition;

interface FailedMapDefinition {
  isSuccess: false;
  errorNodes: [string, Connection][];
}

interface SuccessfulMapDefinition {
  isSuccess: true;
  definition: string;
  warnings?: string[];
}

export const convertToMapDefinition = (
  // danielle can you make the map definition an array instead of an object?
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined,
  targetSchemaSortArray: string[],
  generateHeader = true
): MetaMapDefinition => {
  //const invalidFunctionNodes = invalidFunctions(connections);
  if (sourceSchema && targetSchema) {
    const mapDefinition: MapDefinitionEntry = {};
    const connectionsCopy = structuredClone(connections);
    const rootNodeKey = targetSchema.schemaTreeRoot.qName;

    if (generateHeader) {
      generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    }

    const mapDefinitionBody: MapDefinitionEntry = {};
    generateMapDefinitionBody(mapDefinitionBody, connectionsCopy, targetSchemaSortArray);

    const newArrPath: MapDefinitionEntry[] = [];
    const rootNode = mapDefinitionBody[rootNodeKey];
    convertToArray(rootNode, newArrPath);
    mapDefinition[rootNodeKey] = newArrPath;

    // Custom values directly on target nodes need to have extra single quotes stripped out
    const map = createYamlFromMap(mapDefinition, targetSchemaSortArray);
    const conc = map;

    return { isSuccess: true, definition: conc };
  }

  return { isSuccess: false, errorNodes: [] };
};

export const sortConnectionsToTargetNodes = (targetSchemaConnections: [string, Connection][], targetSchemaSortArray: string[]) => {
  if (targetSchemaSortArray.length === 0) {
    return targetSchemaConnections;
  }
  const targetSchemaSortMap = new Map<string, number>();
  targetSchemaSortArray.forEach((node, index) => {
    targetSchemaSortMap.set(addTargetReactFlowPrefix(node), index);
  });
  const sortedTargetSchemaConnections = targetSchemaConnections.sort(([keyA, _connectionA], [keyBy, _connectionB]) => {
    const aIndex = targetSchemaSortMap.get(keyA);
    const bIndex = targetSchemaSortMap.get(keyBy);
    if (aIndex && bIndex && aIndex > bIndex) {
      return 1;
    }
    return -1;
  });
  return sortedTargetSchemaConnections;
};

export const createYamlFromMap = (mapDefinition: MapDefinitionEntry, targetSchemaSortArray: string[]) => {
  // Custom values directly on target nodes need to have extra single quotes stripped out
  const map = yaml
    .dump(mapDefinition, {
      replacer: yamlReplacer,
      noRefs: true,
      noArrayIndent: true,
      sortKeys: (keyA, keyB) => {
        console.log(keyA);
        console.log(keyB);
        return sortMapDefinition(keyA, keyB, targetSchemaSortArray, mapDefinition);
      }, // danielle pass map definition here to sort
    })
    .replaceAll(/'"|"'/g, '"')
    .replaceAll('- ', '  ');
  return map;
};

const yamlReplacer = (key: string, value: MapDefinitionValue) => {
  if (typeof value === 'string' && key === reservedMapDefinitionKeys.version) {
    return Number.parseFloat(value);
  }

  if (Array.isArray(value)) {
    const modifiedArr = value.map((item) => {
      const newItem: MapDefinitionEntry = {};
      const key = Object.keys(item)[0];
      if (key.length > 36 && isAGuid(key.substring(key.length - 36, key.length))) {
        const newKey = key.substring(0, key.length - 37);
        newItem[newKey] = item[key];
        return newItem;
      }
      return item;
    });
    return modifiedArr;
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

const getConnectionsToTargetNodes = (connections: ConnectionDictionary) => {
  return Object.entries(connections).filter(([key, connection]) => {
    const selfNode = connection.self.node;
    if (key.startsWith(targetPrefix) && isSchemaNodeExtended(selfNode)) {
      const isNotRepeating = selfNode.nodeProperties.every((property) => property !== SchemaNodeProperty.Repeating);
      const isEmptyConnectionNode = isEmptyConnection(connection.inputs[0]);
      return isNotRepeating && !isEmptyConnectionNode;
    }
    return false;
  });
};

// Exported for testing purposes
export const generateMapDefinitionBody = (
  mapDefinition: MapDefinitionEntry,
  connections: ConnectionDictionary,
  targetSchemaSortArray: string[] = []
): void => {
  // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
  const targetSchemaConnections = getConnectionsToTargetNodes(connections);
  const sortedTargetSchemaConnections = sortConnectionsToTargetNodes(targetSchemaConnections, targetSchemaSortArray);

  sortedTargetSchemaConnections.forEach(([_key, connection]) => {
    const inputs = connection?.inputs;
    inputs.forEach((input) => {
      const selfNode = connection.self.node;
      if (input && isSchemaNodeExtended(selfNode)) {
        const pathToCreate = createNewPathItems(input, selfNode, connections);
        applyValueAtPath(mapDefinition, pathToCreate);
      }
    });
  });
};

export const convertToArray = (mapPartial: MapDefinitionValue, newMapArray: MapDefinitionEntry[]): MapDefinitionEntry[] | string => {
  if (typeof mapPartial === 'string') {
    return mapPartial;
  }
  if (!Array.isArray(mapPartial)) {
    Object.keys(mapPartial).forEach((key) => {
      const child = mapPartial[key];
      if (child) {
        newMapArray.push({ [key]: convertToArray(child, []) });
      }
    });
  }

  return newMapArray;
};

const createSourcePath = (
  newPath: OutputPathItem[],
  isFinalPath: boolean,
  pathItem: PathItem,
  connections: ConnectionDictionary,
  input: InputConnection,
  array: PathItem[]
): string | undefined => {
  if (isFinalPath) {
    // Handle custom values, source schema nodes, or Functions applied to the current target schema node
    let value: string | undefined = '';
    if (input && !isEmptyConnection(input)) {
      if (isCustomValueConnection(input)) {
        value = input.value;
      } else if (isSchemaNodeExtended(input.node)) {
        value = input.node.key;
      } else if (input.node.key.startsWith(ifPseudoFunctionKey)) {
        const values = collectConditionalValues(connections[input.reactFlowKey], connections);
        value = values[1];
      } else if (input.node.key.startsWith(directAccessPseudoFunctionKey)) {
        const functionValues = getInputValues(connections[input.reactFlowKey], connections, false);
        value = formatDirectAccess(functionValues[0], functionValues[1], functionValues[2]);
      } else {
        value = collectFunctionValue(
          input.node,
          connections[input.reactFlowKey],
          connections,
          array.some((arrayItems) => arrayItems.repeating)
        );
      }
    } else if (input && isEmptyConnection(input)) {
      value = undefined;
    }
    return value;

    // Still have objects to traverse down
  }
  newPath.push({
    key: pathItem.qName.startsWith('@') ? `$${pathItem.qName}` : pathItem.qName,
  });
  return '';
};

const getSrcPathRelativeToLoop = (newPath: OutputPathItem[]) => {
  const valueToTrim = newPath
    .map((pathItem) => (pathItem.key.startsWith(mapNodeParams.for) ? getSourceKeyOfLastLoop(pathItem.key) : ''))
    .filter((path) => path !== '')
    .join('/');
  return valueToTrim;
};

const getPathForSrcSchemaNode = (sourceNode: NodeConnection, formattedLmlSnippetForTarget: string) => {
  const res = findLast(
    (sourceNode.node as SchemaNodeExtended).pathToRoot,
    (pathItem) => pathItem.repeating && pathItem.key !== formattedLmlSnippetForTarget
  )?.key;
  return res;
};

const createNewPathItems = (input: InputConnection, targetNode: SchemaNodeExtended, connections: ConnectionDictionary) => {
  const newPath: OutputPathItem[] = [];
  const isTargetObjectType = targetNode.nodeProperties.some((property) => property === SchemaNodeProperty.Complex);

  // build the target section of the yml starting with 'root' going down to the target node
  const lastLoop = { loop: '' };
  targetNode.pathToRoot.forEach((targetPath, _index, pathToRoot) => {
    const connectionsIntoCurrentTargetPath = connections[addTargetReactFlowPrefix(targetPath.key)];

    // If there is no rootTargetConnection that means there is a looping node in the source structure, but we aren't using it
    // Probably used for direct index access
    if (targetPath.repeating && connectionsIntoCurrentTargetPath) {
      // Looping schema node
      addLoopingForToNewPathItems(targetPath, connectionsIntoCurrentTargetPath, connections, newPath, lastLoop);
    } else {
      if (connectionsIntoCurrentTargetPath) {
        // Conditionals
        const rootSourceNodes = connectionsIntoCurrentTargetPath.inputs[0];
        const sourceNode = rootSourceNodes;
        if (sourceNode && isNodeConnection(sourceNode) && sourceNode.node.key.startsWith(ifPseudoFunctionKey)) {
          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
        }
      }

      const isFinalPath = targetNode.key === targetPath.key;

      let formattedLmlSnippetForSource = createSourcePath(newPath, isFinalPath, targetPath, connections, input, pathToRoot);

      if (formattedLmlSnippetForSource === undefined) {
        return;
      }

      // construct source side of LML for connection
      if (isFinalPath) {
        const connectionsToTarget = connections[addTargetReactFlowPrefix(targetPath.key)];
        const inputNode = connectionsToTarget.inputs[0];
        if (inputNode && isNodeConnection(inputNode)) {
          if (isFunctionData(inputNode.node)) {
            const valueToTrim = getSrcPathRelativeToLoop(newPath);

            if (valueToTrim) {
              // Need local variables for functions
              if (formattedLmlSnippetForSource === valueToTrim) {
                formattedLmlSnippetForSource = '';
              } else {
                formattedLmlSnippetForSource = formattedLmlSnippetForSource.replaceAll(`${valueToTrim}/`, '');

                // Handle dot access
                if (!formattedLmlSnippetForSource.includes('[') && !formattedLmlSnippetForSource.includes(']')) {
                  formattedLmlSnippetForSource = formattedLmlSnippetForSource.replaceAll(`${valueToTrim}`, '.');
                }
              }
            }
          } else {
            // Need local variables for non-functions
            const valueToTrim = getPathForSrcSchemaNode(inputNode, formattedLmlSnippetForSource);
            if (
              formattedLmlSnippetForSource === inputNode.node.key &&
              inputNode.node.nodeProperties.includes(SchemaNodeProperty.Repeating)
            ) {
              formattedLmlSnippetForSource = '.';
            } else if (valueToTrim) {
              // account for source elements at different level of loop
              let backoutValue = '';
              if (valueToTrim !== lastLoop.loop && !valueToTrim.includes('/*')) {
                // second condition is temporary fix for json arrays
                const loopDifference = lastLoop.loop.replace(valueToTrim || ' ', '');
                for (const i of loopDifference) {
                  if (i === '/') {
                    backoutValue += '../';
                  }
                }
              }
              formattedLmlSnippetForSource = backoutValue + formattedLmlSnippetForSource.replace(`${valueToTrim}/`, '');
            }

            formattedLmlSnippetForSource = formattedLmlSnippetForSource.startsWith('@')
              ? `./${formattedLmlSnippetForSource}`
              : formattedLmlSnippetForSource;
          }
        }

        if (isTargetObjectType) {
          // $Value
          newPath.push({
            key: targetPath.qName.startsWith('@') ? `$${targetPath.qName}` : targetPath.qName,
          });
          newPath.push({
            key: mapNodeParams.value,
            value: formattedLmlSnippetForSource,
          });
        } else {
          // Standard property to value
          newPath.push({
            key: targetPath.qName.startsWith('@') ? `$${targetPath.qName}` : targetPath.qName,
            value: formattedLmlSnippetForSource && !isObjectType(targetNode.type) ? formattedLmlSnippetForSource : undefined,
          });
        }
      }
    }
  });

  return newPath;
};

const addConditionalToNewPathItems = (ifConnection: Connection, connections: ConnectionDictionary, newPath: OutputPathItem[]) => {
  const values = collectConditionalValues(ifConnection, connections);

  // Handle relative paths for (potentially nested) loops
  let valueToTrim = '';
  newPath.forEach((pathItem) => {
    if (pathItem.key.startsWith(mapNodeParams.for)) {
      valueToTrim += `${getSourceKeyOfLastLoop(pathItem.key)}/`;
    }
  });
  const ifContents = values[0].replaceAll(valueToTrim, '');

  const inputConnection = ifConnection.inputs[0];
  inputConnection.customId = generatePostfix();

  // If entry
  newPath.push({
    key: `${mapNodeParams.if}(${ifContents})${inputConnection.customId}`,
  });
};

const addLoopingForToNewPathItems = (
  pathItem: PathItem,
  rootTargetConnection: Connection,
  connections: ConnectionDictionary,
  newPath: OutputPathItem[],
  currentSourceLoop: { loop: string }
) => {
  const rootSourceNodes = [...rootTargetConnection.inputs];

  rootSourceNodes.sort((nodeA, nodeB) => {
    if (isNodeConnection(nodeA) && isNodeConnection(nodeB)) {
      let nodeAToUse = nodeA;
      let nodeBToUse = nodeB;

      // If we are using indices, we want to instead sort off of the schema node, not the index
      // That way if we have layered index pseudo functions they are sorted correctly
      if (nodeA.node.key === indexPseudoFunctionKey) {
        const sourceInput = connections[nodeA.reactFlowKey].inputs[0];
        if (isNodeConnection(sourceInput)) {
          nodeAToUse = sourceInput;
        }
      }

      if (nodeB.node.key === indexPseudoFunctionKey) {
        const sourceInput = connections[nodeB.reactFlowKey].inputs[0];
        if (isNodeConnection(sourceInput)) {
          nodeBToUse = sourceInput;
        }
      }

      return nodeAToUse.reactFlowKey.localeCompare(nodeBToUse.reactFlowKey);
    }
    return 0;
  });

  let prevPathItemWasConditional = false;
  rootSourceNodes.forEach((sourceNode) => {
    let loopValue = '';

    if (sourceNode && isNodeConnection(sourceNode)) {
      if (isFunctionData(sourceNode.node)) {
        if (sourceNode.node.key === ifPseudoFunctionKey) {
          const sourceSchemaNodeConnection = connections[sourceNode.reactFlowKey].inputs[1];
          const sourceSchemaNodeReactFlowKey =
            (isNodeConnection(sourceSchemaNodeConnection) && sourceSchemaNodeConnection.reactFlowKey) || '';

          const indexFunctions = collectTargetNodesForConnectionChain(connections[sourceSchemaNodeReactFlowKey], connections).filter(
            (connection) => connection.node.key === indexPseudoFunctionKey
          );

          if (sourceSchemaNodeConnection.customId === undefined) {
            sourceSchemaNodeConnection.customId = generatePostfix();
          }

          if (indexFunctions.length > 0) {
            const indexConnection = connections[indexFunctions[0].reactFlowKey];
            const inputConnection = indexConnection.inputs[0];
            const inputKey = isNodeConnection(inputConnection) && inputConnection.node.key;

            loopValue = `${mapNodeParams.for}(${inputKey}, ${getIndexValueForCurrentConnection(
              indexConnection,
              connections
            )})${sourceSchemaNodeConnection.customId}`;
          } else {
            loopValue = `${mapNodeParams.for}(${sourceSchemaNodeReactFlowKey.replace(sourcePrefix, '')}${
              sourceSchemaNodeConnection.customId
            })`;
          }

          // For entry
          newPath.push({ key: loopValue });

          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
          prevPathItemWasConditional = true;
        } else {
          // Loop with an index or sequence
          if (!prevPathItemWasConditional) {
            const functionKey = sourceNode.reactFlowKey;
            const functionConnection = connections[functionKey];
            const sequenceValueResult = collectSequenceValue(
              sourceNode.node,
              functionConnection,
              connections,
              true,
              currentSourceLoop.loop
            );

            let postfix = generatePostfix();
            if (functionConnection.inputs[0].customId) {
              postfix = functionConnection.inputs[0].customId;
            } else {
              functionConnection.inputs[0].customId = postfix;
            }

            newPath.forEach((pathItem) => {
              const extractedScope = extractScopeFromLoop(pathItem.key);

              if (extractedScope) {
                sequenceValueResult.sequenceValue = sequenceValueResult.sequenceValue.replaceAll(`${extractedScope}/`, '');
              }
            });

            if (sequenceValueResult.hasIndex) {
              loopValue = `${mapNodeParams.for}(${sequenceValueResult.sequenceValue}, ${getIndexValueForCurrentConnection(
                functionConnection,
                connections
              )})${postfix}`;
            } else {
              loopValue = `${mapNodeParams.for}(${sequenceValueResult.sequenceValue})${postfix}`;
            }

            currentSourceLoop.loop = sequenceValueResult.rootLoop;

            // For entry
            newPath.push({ key: loopValue });
          }

          prevPathItemWasConditional = false;
        }
      } else {
        // Normal loop
        if (!prevPathItemWasConditional) {
          loopValue = sourceNode.node.key;
          if (!sourceNode.customId) {
            sourceNode.customId = generatePostfix();
          }
          const parentConnection = findLast(sourceNode.node.pathToRoot, (pathItem) => {
            const isRepeating = pathItem.repeating && pathItem.key !== loopValue;
            const lowestParentConnections = connections[addSourceReactFlowPrefix(pathItem.key)];
            const isConnected =
              lowestParentConnections && lowestParentConnections.outputs[0] && connectionDoesExist(lowestParentConnections.outputs[0]);
            return isRepeating && isConnected;
          })?.key;
          if (parentConnection) {
            loopValue = loopValue.replace(`${parentConnection}/`, '');
          }

          loopValue = `${mapNodeParams.for}(${loopValue})${sourceNode.customId}`;

          // For entry
          newPath.push({ key: loopValue });
          currentSourceLoop.loop = sourceNode.node.key;
        }

        prevPathItemWasConditional = false;
      }
    }
  });

  const selfNode = rootTargetConnection.self.node;
  const isSchemaNode = isSchemaNodeExtended(selfNode);

  // Object within the loop
  // Skipping ArrayItem items for now, they will come into play with direct access arrays
  if (isSchemaNode && !selfNode.nodeProperties.find((prop) => prop === SchemaNodeProperty.ArrayItem)) {
    newPath.push({
      key: pathItem.qName.startsWith('@') ? `$${pathItem.qName}` : pathItem.qName,
      arrayIndex: isSchemaNodeExtended(selfNode) ? selfNode.arrayItemIndex : undefined,
    });
  }
};

const generatePostfix = () => {
  return `-${guid()}`;
};

const applyValueAtPath = (mapDefinition: MapDefinitionEntry, path: OutputPathItem[]) => {
  path.every((pathItem, pathIndex) => {
    if (pathItem.arrayIndex !== undefined) {
      // When dealing with the map definition we need to access the previous path item, instead of the current
      // this gives us the parent, to put the current node in its parent
      const curPathItem = path[pathIndex - 1];
      const curItem = mapDefinition[curPathItem.key];
      let newArray: (any | undefined)[] = curItem && Array.isArray(curItem) ? curItem : Array(pathItem.arrayIndex + 1).fill(undefined);
      newArray = newArray.fill(undefined, newArray.length, pathItem.arrayIndex + 1);

      const arrayItem: MapDefinitionEntry = {};
      applyValueAtPath(arrayItem, path.slice(pathIndex + 1));

      const combinedArrayItem = extend({}, newArray[pathItem.arrayIndex], arrayItem);

      newArray[pathItem.arrayIndex] = combinedArrayItem;
      mapDefinition[curPathItem.key] = newArray;

      // Return false to break loop
      return false;
    }

    if (!mapDefinition[pathItem.key]) {
      mapDefinition[pathItem.key] = {};
    }

    const nextKey = pathItem.key;
    if (pathItem.value) {
      mapDefinition[pathItem.key] = pathItem.value;
    }

    // Look ahead to see if we need to stay in our current location
    const nextPathItem = path[pathIndex + 1];
    if (!nextPathItem || nextPathItem.arrayIndex === undefined) {
      mapDefinition = mapDefinition[nextKey] as MapDefinitionEntry;
    }

    return true;
  });
};

// this gets the first child of 'if' or 'for' to determine order
// key always starts with 'if' or 'for'
const findKeyInMap = (mapDefinition: MapDefinitionEntry, key: string): string | undefined => {
  if (mapDefinition[key]) {
    return key;
  }

  const keys = Object.keys(mapDefinition);
  for (const currentKey of keys) {
    if (typeof mapDefinition[currentKey] === 'object') {
      const foundKey = findKeyInMap(mapDefinition[currentKey] as MapDefinitionEntry, key);
      if (foundKey) {
        if (mapDefinition[currentKey] && (mapDefinition[currentKey] as MapDefinitionEntry)[foundKey]) {
          const childKey = Object.keys((mapDefinition[currentKey] as MapDefinitionEntry)[foundKey])[0];
          if (!childKey) {
            return foundKey;
          }
          return childKey;
        }
      }
      return foundKey;
    }
  }

  return undefined;
};

const sortMapDefinition = (nameA: any, nameB: any, targetSchemaSortArray: string[], mapDefinition: MapDefinitionEntry): number => {
  let targetForA = nameA;
  if (nameA.startsWith(mapNodeParams.for) || nameA.startsWith(mapNodeParams.if)) {
    // find 'A' in the mapDefintion and find the first child
    targetForA = findKeyInMap(mapDefinition, nameA) ?? '';
  }
  let targetForB = nameB;
  if (nameB.startsWith(mapNodeParams.for) || nameB.startsWith(mapNodeParams.if)) {
    // find 'B' in the mapDefintion and find the first child
    targetForB = findKeyInMap(mapDefinition, nameB) ?? '';
  }

  const potentialKeyObjectsA = targetSchemaSortArray.findIndex((node, _index) => {
    if (node.endsWith(targetForA)) {
      const trimmedNode = node.substring(0, node.indexOf(targetForA) - 1);
      return trimmedNode;
    }
    return false;
  });

  // this does not work 100%, we need full path in next iteration

  const potentialKeyObjectsB = targetSchemaSortArray.findIndex((node, _index) => {
    if (node.endsWith(targetForB)) {
      const trimmedNode = node.substring(0, node.indexOf(targetForB) - 1);
      return trimmedNode;
    }
    return false;
  });

  return potentialKeyObjectsA - potentialKeyObjectsB;
};

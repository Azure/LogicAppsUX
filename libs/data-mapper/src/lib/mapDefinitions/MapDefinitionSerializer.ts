/* eslint-disable no-param-reassign */
import { mapDefinitionVersion, mapNodeParams, reservedMapDefinitionKeys } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary, ConnectionUnit, InputConnection } from '../models/Connection';
import { directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import { findLast } from '../utils/Array.Utils';
import { collectTargetNodesForConnectionChain, flattenInputs, isConnectionUnit, isCustomValue } from '../utils/Connection.Utils';
import {
  collectConditionalValues,
  collectFunctionValue,
  collectSequenceValue,
  extractScopeFromLoop,
  getInputValues,
  getSourceKeyOfLastLoop,
  isValidToMakeMapDefinition,
} from '../utils/DataMap.Utils';
import { formatDirectAccess, getIndexValueForCurrentConnection, isFunctionData } from '../utils/Function.Utils';
import { addTargetReactFlowPrefix } from '../utils/ReactFlow.Util';
import { isObjectType, isSchemaNodeExtended } from '../utils/Schema.Utils';
import type { MapDefinitionEntry, PathItem, SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { extend, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import yaml from 'js-yaml';

interface OutputPathItem {
  key: string;
  value?: string;
  arrayIndex?: number;
}

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined,
  targetSchemaSortArray: string[],
  generateHeader = true
): string => {
  if (sourceSchema && targetSchema && isValidToMakeMapDefinition(connections)) {
    const mapDefinition: MapDefinitionEntry = {};

    if (generateHeader) {
      generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    }

    generateMapDefinitionBody(mapDefinition, connections);

    // Custom values directly on target nodes need to have extra single quotes stripped out
    return yaml
      .dump(mapDefinition, {
        replacer: yamlReplacer,
        noRefs: true,
        sortKeys: (keyA, keyB) => sortMapDefinition(keyA, keyB, targetSchemaSortArray),
      })
      .replaceAll(/'"|"'/g, '"');
  }

  return '';
};

const yamlReplacer = (key: string, value: any) => {
  if (typeof value === 'string' && key === reservedMapDefinitionKeys.version) {
    return parseFloat(value);
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
      return selfNode.nodeProperties.every((property) => property !== SchemaNodeProperty.Repeating);
    } else {
      return false;
    }
  });
};

// Exported for testing purposes
export const generateMapDefinitionBody = (mapDefinition: MapDefinitionEntry, connections: ConnectionDictionary): void => {
  // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
  const targetSchemaConnections = getConnectionsToTargetNodes(connections);

  targetSchemaConnections.forEach(([_key, connection]) => {
    const flattenedInputs = flattenInputs(connection?.inputs);
    flattenedInputs.forEach((input) => {
      const selfNode = connection.self.node;
      if (input && isSchemaNodeExtended(selfNode)) {
        const pathToCreate = createNewPathItems(input, selfNode, connections);
        applyValueAtPath(mapDefinition, pathToCreate);
      }
    });
  });
};

const createSourcePath = (
  newPath: OutputPathItem[],
  isFinalPath: boolean,
  pathItem: PathItem,
  connections: ConnectionDictionary,
  input: InputConnection,
  array: PathItem[]
): string => {
  if (!isFinalPath) {
    // Still have objects to traverse down
    newPath.push({ key: pathItem.qName.startsWith('@') ? `$${pathItem.qName}` : pathItem.qName });
  } else {
    // Handle custom values, source schema nodes, or Functions applied to the current target schema node
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
      }
    }
    return value;
  }
  return '';
};

const getSrcPathRelativeToLoop = (newPath: OutputPathItem[]) => {
  const valueToTrim = newPath
    .map((pathItem) => (pathItem.key.startsWith(mapNodeParams.for) ? getSourceKeyOfLastLoop(pathItem.key) : ''))
    .filter((path) => path !== '')
    .join('/');
  return valueToTrim;
};

const getPathForSrcSchemaNode = (sourceNode: ConnectionUnit, formattedLmlSnippetForTarget: string) => {
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
  targetNode.pathToRoot.forEach((targetPath, index, pathToRoot) => {
    const connectionsIntoCurrentTargetPath = connections[addTargetReactFlowPrefix(targetPath.key)];

    // If there is no rootTargetConnection that means there is a looping node in the source structure, but we aren't using it
    // Probably used for direct index access
    if (targetPath.repeating && connectionsIntoCurrentTargetPath) {
      // Looping schema node
      addLoopingToNewPathItems(targetPath, connectionsIntoCurrentTargetPath, connections, newPath, lastLoop);
    } else {
      if (connectionsIntoCurrentTargetPath) {
        // Conditionals
        const rootSourceNodes = connectionsIntoCurrentTargetPath.inputs[0];
        const sourceNode = rootSourceNodes[0];
        if (sourceNode && isConnectionUnit(sourceNode) && sourceNode.node.key.startsWith(ifPseudoFunctionKey)) {
          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
        }
      }

      const isFinalPath = targetNode.key === targetPath.key;

      let formattedLmlSnippetForSource = createSourcePath(newPath, isFinalPath, targetPath, connections, input, pathToRoot);

      // construct source side of LML for connection
      if (isFinalPath) {
        const connectionsToTarget = connections[addTargetReactFlowPrefix(targetPath.key)];
        const inputIntoTargetNode = connectionsToTarget.inputs[0];
        const inputNode = inputIntoTargetNode[0];
        if (inputNode && isConnectionUnit(inputNode)) {
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
          newPath.push({ key: targetPath.qName.startsWith('@') ? `$${targetPath.qName}` : targetPath.qName });
          newPath.push({ key: mapNodeParams.value, value: formattedLmlSnippetForSource });
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

  // If entry
  newPath.push({ key: `${mapNodeParams.if}(${ifContents})` });
};

const addLoopingToNewPathItems = (
  pathItem: PathItem,
  rootTargetConnection: Connection,
  connections: ConnectionDictionary,
  newPath: OutputPathItem[],
  currentLoop: { loop: string }
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

  let prevPathItemWasConditional = false;
  rootSourceNodes.forEach((sourceNode) => {
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

            loopValue = `${mapNodeParams.for}(${inputKey}, ${getIndexValueForCurrentConnection(indexConnection, connections)})`;
          } else {
            loopValue = `${mapNodeParams.for}(${sourceSchemaNodeReactFlowKey.replace(sourcePrefix, '')})`;
          }

          // For entry
          newPath.push({ key: loopValue });

          addConditionalToNewPathItems(connections[sourceNode.reactFlowKey], connections, newPath);
          prevPathItemWasConditional = true;
        } else {
          // Loop with an index
          if (!prevPathItemWasConditional) {
            const functionKey = sourceNode.reactFlowKey;
            const functionConnection = connections[functionKey];
            const sequenceValueResult = collectSequenceValue(sourceNode.node, functionConnection, connections, true);

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
              )})`;
            } else {
              loopValue = `${mapNodeParams.for}(${sequenceValueResult.sequenceValue})`;
            }

            // For entry
            newPath.push({ key: loopValue });
          }

          prevPathItemWasConditional = false;
        }
      } else {
        // Normal loop
        if (!prevPathItemWasConditional) {
          loopValue = sourceNode.node.key;
          const valueToTrim = findLast(sourceNode.node.pathToRoot, (pathItem) => pathItem.repeating && pathItem.key !== loopValue)?.key;
          if (valueToTrim) {
            loopValue = loopValue.replace(`${valueToTrim}/`, '');
          }

          loopValue = `${mapNodeParams.for}(${loopValue})`;

          // For entry
          newPath.push({ key: loopValue });
          currentLoop.loop = sourceNode.node.key;
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

const applyValueAtPath = (mapDefinition: MapDefinitionEntry, path: OutputPathItem[]) => {
  path.every((pathItem, pathIndex) => {
    if (pathItem.arrayIndex !== undefined) {
      // When dealing with the map definition we need to access the previous path item, instead of the current
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
    } else {
      if (!mapDefinition[pathItem.key]) {
        mapDefinition[pathItem.key] = {};
      }

      if (pathItem.value) {
        mapDefinition[pathItem.key] = pathItem.value;
      }

      // Look ahead to see if we need to stay in our current location
      const nextPathItem = path[pathIndex + 1];
      if (!nextPathItem || nextPathItem.arrayIndex === undefined) {
        mapDefinition = mapDefinition[pathItem.key] as MapDefinitionEntry;
      }
    }

    return true;
  });
};

const sortMapDefinition = (nameA: any, nameB: any, targetSchemaSortArray: string[]): number => {
  const potentialKeyObjects = targetSchemaSortArray.filter((node, _index, origArray) => {
    if (node.endsWith(nameA)) {
      const trimmedNode = node.substring(0, node.indexOf(nameA) - 1);
      const hasNodeB = origArray.find((nodeB) => nodeB === `${trimmedNode}/${nameB}`);

      return !!hasNodeB;
    }

    return false;
  });

  if (potentialKeyObjects.length === 0) {
    return 0;
  }

  const keyA = potentialKeyObjects[0];
  const trimmedNode = keyA.substring(0, keyA.indexOf(nameA) - 1);
  return targetSchemaSortArray.indexOf(keyA) - targetSchemaSortArray.indexOf(`${trimmedNode}/${nameB}`);
};

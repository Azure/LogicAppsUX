/* eslint-disable no-param-reassign */
import {
  customValueQuoteToken,
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import { indexKey } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeProperties } from '../models/Schema';
import {
  addNodeToConnections,
  collectNodesForConnectionChain,
  flattenInputs,
  isCustomValue,
  nodeHasSourceNodeEventually,
  nodeHasSpecificSourceNodeEventually,
} from './Connection.Utils';
import { findFunctionForFunctionName, findFunctionForKey, isFunctionData } from './Function.Utils';
import { addTargetReactFlowPrefix, createReactFlowFunctionKey } from './ReactFlow.Util';
import { findNodeForKey, isSchemaNodeExtended } from './Schema.Utils';
import { isAGuid } from '@microsoft-logic-apps/utils';
import yaml from 'js-yaml';

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined
): string => {
  if (sourceSchema && targetSchema && isValidToMakeMapDefinition(connections)) {
    const mapDefinition: MapDefinitionEntry = {};

    generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    generateMapDefinitionBody(mapDefinition, connections);

    return yaml.dump(mapDefinition, { quotingType: `"`, replacer: yamlReplacer }).replaceAll(customValueQuoteToken, '"');
  }

  return '';
};

const generateMapDefinitionHeader = (
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

const generateMapDefinitionBody = (mapDefinition: MapDefinitionEntry, connections: ConnectionDictionary): void => {
  Object.values(connections).forEach((connection) => {
    const flattenedInputs = flattenInputs(connection.inputs);
    flattenedInputs.forEach((input) => {
      // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
      const selfNode = connection.self.node;
      if (input && isSchemaNodeExtended(selfNode)) {
        if (isCustomValue(input)) {
          applyValueAtPath(formatCustomValue(input), mapDefinition, selfNode, selfNode.pathToRoot, connections);
        } else if (isSchemaNodeExtended(input.node)) {
          applyValueAtPath(input.node.key, mapDefinition, selfNode, selfNode.pathToRoot, connections);
        } else {
          const currentConnection = connections[input.reactFlowKey];
          const connectionChain = collectNodesForConnectionChain(currentConnection, connections);
          const containsRepeatingNode = connectionChain.some((connectionChainItem) => {
            const node = connectionChainItem.node;
            return isSchemaNodeExtended(node) && node.properties === SchemaNodeProperties.Repeating;
          });

          if (containsRepeatingNode) {
            // Temp Still need to handle functions in loops
          } else {
            const value = collectValueForFunction(input.node, connections[input.reactFlowKey], connections);
            applyValueAtPath(value, mapDefinition, selfNode, selfNode.pathToRoot, connections);
          }
        }
      }
    });
  });
};

const applyValueAtPath = (
  value: string,
  mapDefinition: MapDefinitionEntry,
  destinationNode: SchemaNodeExtended,
  path: PathItem[],
  connections: ConnectionDictionary
) => {
  const pathLocation = path[0].fullName;
  const formattedPathLocation = pathLocation.startsWith('@') ? `$${pathLocation}` : pathLocation;

  if (path.length > 1) {
    if (path[0].repeating) {
      generateForSection(value.substring(0, value.lastIndexOf('/')), value, mapDefinition, destinationNode, path, connections);
    } else {
      if (!mapDefinition[formattedPathLocation]) {
        mapDefinition[formattedPathLocation] = {};
      }

      if (typeof mapDefinition[formattedPathLocation] !== 'string') {
        applyValueAtPath(value, mapDefinition[formattedPathLocation] as MapDefinitionEntry, destinationNode, path.slice(1), connections);
      }
    }
  } else {
    if (destinationNode.properties === SchemaNodeProperties.ComplexTypeSimpleContent) {
      if (!mapDefinition[formattedPathLocation]) {
        mapDefinition[formattedPathLocation] = {
          [mapNodeParams.value]: value,
        };
      } else {
        (mapDefinition[formattedPathLocation] as MapDefinitionEntry)[mapNodeParams.value] = value;
      }
    } else if (destinationNode.properties !== SchemaNodeProperties.Repeating) {
      mapDefinition[formattedPathLocation] = value;
    }
  }
};

const generateForSection = (
  loopValue: string,
  value: string,
  mapDefinition: MapDefinitionEntry,
  destinationNode: SchemaNodeExtended,
  path: PathItem[],
  connections: ConnectionDictionary
) => {
  const pathLocation = path[0].fullName;
  // Local loop variables use current working directory './' instead of '$'
  const formattedPathLocation = pathLocation.startsWith('@') ? `./${pathLocation}` : pathLocation;

  // TODO allow for nested loops
  const forEntry = nodeHasSpecificSourceNodeEventually(indexKey, connections[addTargetReactFlowPrefix(path[0].key)], connections, false)
    ? `${mapNodeParams.for}(${loopValue}, $i)`
    : `${mapNodeParams.for}(${loopValue})`;
  if (!mapDefinition[forEntry]) {
    mapDefinition[forEntry] = {};
  }

  // Step into the loop
  mapDefinition = mapDefinition[forEntry] as MapDefinitionEntry;

  if (!mapDefinition[formattedPathLocation]) {
    mapDefinition[formattedPathLocation] = {};
  }

  const loopLocalValue = value.replace(`${loopValue}/`, '');

  applyValueAtPath(loopLocalValue, mapDefinition[formattedPathLocation] as MapDefinitionEntry, destinationNode, path.slice(1), connections);
};

const collectValueForFunction = (node: FunctionData, currentConnection: Connection, connections: ConnectionDictionary): string => {
  const inputValues = currentConnection
    ? (flattenInputs(currentConnection.inputs)
        .flatMap((input) => {
          if (!input) {
            return undefined;
          }

          if (isCustomValue(input)) {
            return formatCustomValue(input);
          } else if (isSchemaNodeExtended(input.node)) {
            return input.node.fullName.startsWith('@') ? `$${input.node.fullName}` : input.node.fullName;
          } else {
            return collectValueForFunction(input.node, connections[input.reactFlowKey], connections);
          }
        })
        .filter((mappedInput) => !!mappedInput) as string[])
    : [];

  return combineFunctionAndInputs(node, inputValues);
};

const combineFunctionAndInputs = (functionData: FunctionData, inputs: string[]): string => {
  return `${functionData.functionName}(${inputs.join(', ')})`;
};

export const isValidToMakeMapDefinition = (connections: ConnectionDictionary): boolean => {
  // All functions connections must eventually terminate into the source
  const connectionsArray = Object.entries(connections);
  if (
    !connectionsArray
      .filter(([key, _connection]) => key.startsWith(targetPrefix))
      .every(([_key, targetConnection]) => nodeHasSourceNodeEventually(targetConnection, connections))
  ) {
    return false;
  }

  // Is valid to generate the map definition
  return true;
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
    const sourceNode =
      sourceEndOfFunction > -1
        ? findFunctionForFunctionName(sourceNodeObject.substring(0, sourceEndOfFunction), functions)
        : findNodeForKey(sourceNodeObject, sourceSchema.schemaTreeRoot);
    const sourceKey =
      sourceNode && isFunctionData(sourceNode)
        ? createdNodes[sourceNodeObject]
          ? createdNodes[sourceNodeObject]
          : createReactFlowFunctionKey(sourceNode)
        : `${sourcePrefix}${sourceNodeObject}`;
    createdNodes[sourceNodeObject] = sourceKey;

    const destinationFunctionKey = targetKey.slice(0, targetKey.indexOf('-'));
    const destinationFunctionGuid = targetKey.slice(targetKey.indexOf('-') + 1);
    const destinationNode = isAGuid(destinationFunctionGuid)
      ? findFunctionForKey(destinationFunctionKey, functions)
      : findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const destinationKey = isAGuid(destinationFunctionGuid) ? targetKey : `${targetPrefix}${targetKey}`;

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

const formatCustomValue = (customValue: string) => customValueQuoteToken + customValue + customValueQuoteToken;

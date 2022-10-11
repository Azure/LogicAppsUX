/* eslint-disable no-param-reassign */
import {
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary, ConnectionInput, ConnectionUnit } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeProperties } from '../models/Schema';
import { findFunctionForFunctionName, findFunctionForKey, isFunctionData } from './Function.Utils';
import { createReactFlowFunctionKey } from './ReactFlow.Util';
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

    return yaml.dump(mapDefinition);
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
    const destinationNode = connection.destination.node;
    connection.inputs.forEach((input) => {
      // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
      if (input && isSchemaNodeExtended(destinationNode)) {
        if (isCustomValue(input)) {
          applyValueAtPath(input, mapDefinition, destinationNode, destinationNode.pathToRoot);
        } else if (isSchemaNodeExtended(input.node)) {
          applyValueAtPath(input.node.fullName, mapDefinition, destinationNode, destinationNode.pathToRoot);
        } else {
          const value = collectValueForFunction(input.node, connections[input.reactFlowKey], connections);
          applyValueAtPath(value, mapDefinition, destinationNode, destinationNode.pathToRoot);
        }
      }
    });
  });
};

const applyValueAtPath = (value: string, mapDefinition: MapDefinitionEntry, destinationNode: SchemaNodeExtended, path: PathItem[]) => {
  const pathLocation = path[0].fullName;
  const formattedPathLocation = pathLocation.startsWith('@') ? `$${pathLocation}` : pathLocation;

  if (path.length > 1) {
    if (!mapDefinition[formattedPathLocation]) {
      mapDefinition[formattedPathLocation] = {};
    }

    if (typeof mapDefinition[formattedPathLocation] !== 'string') {
      applyValueAtPath(value, mapDefinition[formattedPathLocation] as MapDefinitionEntry, destinationNode, path.slice(1));
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
    } else {
      mapDefinition[formattedPathLocation] = value;
    }
  }
};

const collectValueForFunction = (node: FunctionData, currentConnection: Connection, connections: ConnectionDictionary): string => {
  const inputValues = currentConnection
    ? (currentConnection.inputs
        .flatMap((input) => {
          if (!input) {
            return undefined;
          }

          if (isCustomValue(input)) {
            return input;
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

const nodeHasSourceNodeEventually = (currentConnection: Connection, connections: ConnectionDictionary): boolean => {
  if (!currentConnection) {
    return false;
  }

  // Put 0 input, content enricher functions in the node bucket
  const definedNonCustomValueInputs = currentConnection.inputs.filter((input) => !!input && !isCustomValue(input)) as ConnectionUnit[];
  const functionInputs = definedNonCustomValueInputs.filter((input) => isFunctionData(input.node) && input.node.maxNumberOfInputs !== 0);
  const nodeInputs = definedNonCustomValueInputs.filter((input) => isSchemaNodeExtended(input.node) || input.node.maxNumberOfInputs === 0);

  // All the sources are input nodes
  if (nodeInputs.length === currentConnection.inputs.length) {
    return true;
  } else {
    // Still have traversing to do
    if (functionInputs.length > 0) {
      return functionInputs.every((functionInput) => {
        return nodeHasSourceNodeEventually(connections[functionInput.reactFlowKey], connections);
      });
    } else {
      return false;
    }
  }
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

const addNodeToConnections = (
  connections: ConnectionDictionary,
  sourceNode: SchemaNodeExtended | FunctionData,
  sourceReactFlowKey: string,
  destinationNode: SchemaNodeExtended | FunctionData,
  destinationReactFlowKey: string
) => {
  if (sourceNode && destinationNode) {
    if (!connections[destinationReactFlowKey]) {
      connections[destinationReactFlowKey] = {
        destination: { node: destinationNode, reactFlowKey: destinationReactFlowKey },
        inputs: [{ node: sourceNode, reactFlowKey: sourceReactFlowKey }],
      };
    } else {
      connections[destinationReactFlowKey].inputs.push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
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

export const getEdgeForSource = (connection: Connection, source: string) => {
  return connection.inputs.find((conn) => !!conn && !isCustomValue(conn) && conn.reactFlowKey === source);
};

export const isCustomValue = (connectionInput: ConnectionInput): connectionInput is string => typeof connectionInput === 'string';

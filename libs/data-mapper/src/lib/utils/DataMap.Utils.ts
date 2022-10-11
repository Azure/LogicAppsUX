/* eslint-disable no-param-reassign */
import {
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeProperties, SchemaTypes } from '../models/Schema';
import { findFunctionForFunctionName, findFunctionForKey, isFunctionData } from './Function.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from './ReactFlow.Util';
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
    connection.sources.forEach((source) => {
      // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
      if (isSchemaNodeExtended(destinationNode)) {
        if (isSchemaNodeExtended(source.node)) {
          applyValueAtPath(source.node.fullName, mapDefinition, destinationNode, destinationNode.pathToRoot);
        } else {
          const value = collectValueForFunction(source.node, connections[source.reactFlowKey], connections);
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
    ? currentConnection.sources.flatMap((source) => {
        if (isSchemaNodeExtended(source.node)) {
          return source.node.fullName.startsWith('@') ? `$${source.node.fullName}` : source.node.fullName;
        } else {
          return collectValueForFunction(source.node, connections[source.reactFlowKey], connections);
        }
      })
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
  const functionSources = currentConnection.sources.filter((source) => isFunctionData(source.node) && source.node.maxNumberOfInputs !== 0);
  const nodeSources = currentConnection.sources.filter(
    (source) => isSchemaNodeExtended(source.node) || source.node.maxNumberOfInputs === 0
  );

  // All the sources are input nodes
  if (nodeSources.length === currentConnection.sources.length) {
    return true;
  } else {
    // Still have traversing to do
    if (functionSources.length > 0) {
      return functionSources.every((functionSource) => {
        return nodeHasSourceNodeEventually(connections[functionSource.reactFlowKey], connections);
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
        sources: [{ node: sourceNode, reactFlowKey: sourceReactFlowKey }],
      };
    } else {
      connections[destinationReactFlowKey].sources.push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
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
  return connection.sources.find((conn) => conn.reactFlowKey === source);
};

export const getEdgeForTarget = (connections: ConnectionDictionary, target: string) => {
  const key = Object.keys(connections).find((id) => id.includes(target));
  return key ? connections[key] : undefined;
};

export const getEdgeForSourceFromAllConnections = (connections: ConnectionDictionary, source: string) => {
  let edge;
  Object.values(connections).forEach((connection) => {
    const tempEdge = getEdgeForSource(connection, addReactFlowPrefix(source, SchemaTypes.Source));
    if (tempEdge) {
      edge = tempEdge;
    }
  });
  return edge;
};

export const hasEdgeFromSource = (connectionDict: ConnectionDictionary, source: string): boolean => {
  const firstConnection = Object.values(connectionDict).find((connection) => {
    const tempEdge = getEdgeForSource(connection, addReactFlowPrefix(source, SchemaTypes.Source));
    if (tempEdge) {
      return true;
    }
    return false;
  });
  return firstConnection ? true : false;
};

export const getEdgeForSourcesFromAllEdges = (connectionDict: ConnectionDictionary, source: string): Connection[] => {
  const edges: Connection[] = [];
  Object.values(connectionDict).forEach((connection) => {
    const tempEdge = getEdgeForSource(connection, source);
    if (tempEdge) {
      edges.push(connection);
    }
  });
  return edges;
};

// eslint-disable-next-line no-prototype-builtins
export const isNodeSchema = (node: SchemaNodeExtended | FunctionData): boolean => node.hasOwnProperty('schemaNodeDataType');

export const eventuallyConnectsToSourceAndTarget = (source: string, destination: string, dict: ConnectionDictionary): boolean => {
  const hasTarget = hasEventualTarget(destination, dict);
  const hasSource = hasEventualSource(source, dict);
  return hasTarget && hasSource;
};

export const hasEventualTarget = (dest: string, dict: ConnectionDictionary): boolean => {
  // destination becomes future source
  const nextEdges = getEdgeForSourcesFromAllEdges(dict, dest);
  if (nextEdges.length === 0) {
    if (dest.includes('target')) {
      return true;
    }
    return false;
  }
  nextEdges.find((edge) => {
    return hasEventualTarget(edge.destination.reactFlowKey, dict);
  });
  return true;
};

export const hasEventualSource = (source: string, dict: ConnectionDictionary): boolean => {
  if (source.includes('source')) {
    return true;
  }
  // source becomes needed destination
  const nextEdges = getEdgeForTarget(dict, source);
  if (nextEdges) {
    const sourceNode = nextEdges.sources.find((source) => source.reactFlowKey.includes('source'));
    if (sourceNode) {
      return true;
    } else {
      nextEdges.sources.find((source) => {
        return hasEventualSource(source.reactFlowKey, dict);
      });
    }
  }
  return false;
};

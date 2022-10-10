/* eslint-disable no-param-reassign */
import {
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { InvalidFormatException, InvalidFormatExceptionCode } from '../exceptions/MapDefinitionExceptions';
import type { Connection, ConnectionDictionary, ConnectionUnit, LoopConnection } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { isFunctionData } from './Function.Utils';
import { addReactFlowPrefix } from './ReactFlow.Util';
import { findNodeForKey, isSchemaNodeExtended } from './Schema.Utils';
import yaml from 'js-yaml';

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema?: SchemaExtended,
  targetSchema?: SchemaExtended
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
    connection.sources.forEach((source) => {
      // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
      if (isSchemaNodeExtended(connection.destination.node)) {
        if (isSchemaNodeExtended(source.node)) {
          applyValueAtPath(source.node.fullName, mapDefinition, connection.destination.node.pathToRoot);
        } else {
          const value = collectValueForFunction(source.node, connections[source.reactFlowKey], connections);
          applyValueAtPath(value, mapDefinition, connection.destination.node.pathToRoot);
        }
      }
    });
  });
};

const applyValueAtPath = (value: string, mapDefinition: MapDefinitionEntry, path: PathItem[]) => {
  const pathLocation = path[0].fullName;
  if (path.length > 1) {
    if (!mapDefinition[pathLocation]) {
      mapDefinition[pathLocation] = {};
    }

    if (typeof mapDefinition[pathLocation] !== 'string') {
      applyValueAtPath(value, mapDefinition[pathLocation] as MapDefinitionEntry, path.slice(1));
    }
  } else {
    mapDefinition[pathLocation] = value.startsWith('@') ? `$${value}` : value;
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
  targetSchema: SchemaExtended
): ConnectionDictionary => {
  const connections: ConnectionDictionary = {};
  const parsedYamlKeys: string[] = Object.keys(mapDefinition);

  const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

  if (rootNodeKey) {
    parseDefinitionToConnection(rootNodeKey, mapDefinition[rootNodeKey], `/${rootNodeKey}`, connections, sourceSchema, targetSchema);
  }

  return connections;
};

const parseDefinitionToConnection = (
  sourceNodeKey: string,
  sourceNodeObject: string | object | any,
  targetKey: string,
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
) => {
  // Basic leaf node
  if (typeof sourceNodeObject === 'string') {
    const destinationNode = findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const sourceNode = findNodeForKey(sourceNodeObject, sourceSchema.schemaTreeRoot);

    if (sourceNode && destinationNode) {
      if (!connections[targetKey]) {
        connections[targetKey] = {
          destination: { node: destinationNode, reactFlowKey: `${targetPrefix}${targetKey}` },
          sources: [{ node: sourceNode, reactFlowKey: `${sourcePrefix}${sourceNodeObject}` }],
          loop: undefined,
          condition: undefined,
        };
      } else {
        connections[targetKey].sources.push({ node: sourceNode, reactFlowKey: `${sourcePrefix}${sourceNodeObject}` });
      }
    }

    return;
  }

  const startsWithFor = sourceNodeKey.startsWith(mapNodeParams.for);
  const startsWithIf = sourceNodeKey.startsWith(mapNodeParams.if);

  if (startsWithFor || startsWithIf) {
    const childrenKeys = Object.keys(sourceNodeObject);
    if (childrenKeys.length !== 1) {
      throw new InvalidFormatException(
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM,
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM
      );
    }

    const newTargetKey = `${targetKey}/${childrenKeys[0]}`;
    parseDefinitionToConnection(
      `${childrenKeys[0]}`,
      sourceNodeObject[childrenKeys[0]],
      newTargetKey,
      connections,
      sourceSchema,
      targetSchema
    );

    // TODO (#15388621) revisit this once we've got loops and conditionals enabled in the designer to double check all the logic
    if (connections[newTargetKey]) {
      connections[newTargetKey].loop = startsWithFor ? parseLoopMapping(sourceNodeKey) : undefined;
      connections[newTargetKey].condition = startsWithIf ? parseConditionalMapping(sourceNodeKey) : undefined;
    }

    return;
  }

  const targetValue = sourceNodeObject?.[mapNodeParams.value];

  for (const childKey in sourceNodeObject) {
    if (childKey !== mapNodeParams.value) {
      parseDefinitionToConnection(
        childKey,
        sourceNodeObject[childKey],
        `${targetKey}/${childKey}`,
        connections,
        sourceSchema,
        targetSchema
      );
    }
  }

  // TODO (#15388621) revisit this once we've got loops and conditionals enabled in the designer to double check all the logic
  if (targetValue) {
    const destinationNode = findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const sourceNode = findNodeForKey(sourceNodeKey, sourceSchema.schemaTreeRoot);

    if (sourceNode && destinationNode) {
      if (!connections[targetKey]) {
        connections[targetKey] = {
          destination: { node: destinationNode, reactFlowKey: `${targetPrefix}${targetKey}` },
          sources: [{ node: sourceNode, reactFlowKey: `${sourcePrefix}${targetValue}` }],
          loop: undefined,
          condition: undefined,
        };
      } else {
        connections[targetKey].sources.push({ node: sourceNode, reactFlowKey: `${sourcePrefix}${targetValue}` });
      }
    }
  }
};

// Exported for testing purposes only
export const parseLoopMapping = (line: string): LoopConnection => {
  const formattedLine = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim();
  const functionSplitOnComma = formattedLine.split(',');

  return {
    loopSource: functionSplitOnComma[0].trim(),
    loopIndex: functionSplitOnComma[1]?.trim(),
  };
};

// Exported for testing purposes only
export const parseConditionalMapping = (line: string): string => {
  return line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim();
};

export const getEdgeForSource = (connection: Connection, source: string) => {
  return connection.sources.find((conn) => conn.reactFlowKey === source);
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

export const getEdgeForSourcesFromAllEdges = (connectionDict: ConnectionDictionary, source: string): ConnectionUnit[] => {
  const edges: ConnectionUnit[] = [];
  Object.values(connectionDict).forEach((connection) => {
    const tempEdge = getEdgeForSource(connection, addReactFlowPrefix(source, SchemaTypes.Source));
    if (tempEdge) {
      edges.push(tempEdge);
    }
  });
  return edges;
};

// eslint-disable-next-line no-prototype-builtins
export const isNodeSchema = (node: SchemaNodeExtended | FunctionData): boolean => node.hasOwnProperty('schemaNodeDataType');

export const eventuallyConnectsToSourceAndTarget = (): boolean => {
  // need to trace forwards and backwards lol
  return true;
};

export const hasEventualTarget = (dest: string, dict: ConnectionDictionary): boolean => {
  // eventually refactor to work with source?
  //const dest = connection.destination.reactFlowKey; // destination becomes future source
  const nextEdges = getEdgeForSourcesFromAllEdges(dict, dest);
  if (nextEdges.length === 0) {
    return false;
  }
  nextEdges.find((edge) => {
    return hasEventualTarget(edge.reactFlowKey, dict);
  });
  return true;
};

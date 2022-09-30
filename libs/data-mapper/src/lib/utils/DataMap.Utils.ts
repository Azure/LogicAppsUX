/* eslint-disable no-param-reassign */
import {
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { InvalidFormatException, InvalidFormatExceptionCode } from '../exceptions/MapDefinitionExceptions';
import type { ConnectionDictionary, LoopConnection } from '../models/Connection';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { sourcePrefix, targetPrefix } from '../utils/ReactFlow.Util';
import { createConnectionKey } from './DataMapIds.Utils';
import { findNodeForKey } from './Schema.Utils';
import yaml from 'js-yaml';

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema?: SchemaExtended,
  targetSchema?: SchemaExtended
): string => {
  if (sourceSchema && targetSchema) {
    const mapDefinition: MapDefinitionEntry = {};

    generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    generateMapDefinitionBody(mapDefinition, connections);

    console.log(yaml.dump(mapDefinition));

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
    applyValueAtPath(connection.source.key, mapDefinition, (connection.destination as SchemaNodeExtended).pathToRoot);
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
    mapDefinition[pathLocation] = value;
  }
};

// XXX
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
      const connectionKey = createConnectionKey(sourceNodeObject, targetKey);
      connections[connectionKey] = {
        destination: destinationNode,
        source: sourceNode,
        loop: undefined,
        condition: undefined,
        // Needs to be addressed again once we have functions properly coded out in the designer
        reactFlowSource: `${sourcePrefix}${sourceNodeObject}`,
        reactFlowDestination: `${targetPrefix}${targetKey}`,
      };
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
    const newConnectionKey = createConnectionKey(sourceNodeKey, newTargetKey);
    if (connections[newConnectionKey]) {
      connections[newConnectionKey].loop = startsWithFor ? parseLoopMapping(sourceNodeKey) : undefined;
      connections[newConnectionKey].condition = startsWithIf ? parseConditionalMapping(sourceNodeKey) : undefined;
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
    const connectionKey = createConnectionKey(sourceNodeKey, targetKey);
    const destinationNode = findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const sourceNode = findNodeForKey(sourceNodeKey, sourceSchema.schemaTreeRoot);

    if (sourceNode && destinationNode) {
      connections[connectionKey] = {
        destination: destinationNode,
        source: sourceNode,
        loop: undefined,
        condition: undefined,
        reactFlowSource: `${sourcePrefix}${targetValue}`,
        reactFlowDestination: `${targetPrefix}${targetKey}`,
      };
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

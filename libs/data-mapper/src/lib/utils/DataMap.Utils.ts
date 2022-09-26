/* eslint-disable no-param-reassign */
import {
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
  yamlFormats,
} from '../constants/MapDefinitionConstants';
import { InvalidFormatException, InvalidFormatExceptionCode } from '../exceptions/MapDefinitionExceptions';
import type { ConnectionDictionary, LoopConnection } from '../models/Connection';
import type { DataMap, MapNode } from '../models/DataMap';
import type { SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { inputPrefix, outputPrefix } from '../utils/ReactFlow.Util';
import yaml from 'js-yaml';

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema?: SchemaExtended,
  targetSchema?: SchemaExtended
): string => {
  if (sourceSchema && targetSchema) {
    const dataMap = generateDataMap(connections, sourceSchema.name, targetSchema);

    const mapDefinitionHeader = generateMapDefinitionHeader(sourceSchema, targetSchema);

    const mapDefinition = keepNode(dataMap.mappings)
      ? `${mapDefinitionHeader}${nodeToMapDefinition(dataMap.mappings, '').trim()}`
      : mapDefinitionHeader;
    return mapDefinition;
  }

  return '';
};

const generateMapDefinitionHeader = (sourceSchema: SchemaExtended, targetSchema: SchemaExtended): string => {
  let mapDefinitionHeader = `${reservedMapDefinitionKeys.version}: ${mapDefinitionVersion}${yamlFormats.newLine}`;
  mapDefinitionHeader += `${reservedMapDefinitionKeys.sourceFormat}: ${sourceSchema.type}${yamlFormats.newLine}`;
  mapDefinitionHeader += `${reservedMapDefinitionKeys.targetFormat}: ${targetSchema.type}${yamlFormats.newLine}`;
  mapDefinitionHeader += `${reservedMapDefinitionKeys.sourceSchemaName}: ${targetSchema.name}${yamlFormats.newLine}`;
  mapDefinitionHeader += `${reservedMapDefinitionKeys.targetSchemaName}: ${targetSchema.name}${yamlFormats.newLine}`;

  if (sourceSchema.namespaces && sourceSchema.namespaces.size > 0) {
    mapDefinitionHeader += `${reservedMapDefinitionKeys.sourceNamespaces}:${yamlFormats.newLine}`;
    mapDefinitionHeader += generateNamespaceEntries(sourceSchema.namespaces);
  }

  if (targetSchema.namespaces && targetSchema.namespaces.size > 0) {
    mapDefinitionHeader += `${reservedMapDefinitionKeys.targetNamespaces}:${yamlFormats.newLine}`;
    mapDefinitionHeader += generateNamespaceEntries(targetSchema.namespaces);
  }

  return mapDefinitionHeader;
};

const generateNamespaceEntries = (namespaces: Map<string, string>): string => {
  let results = '';
  namespaces.forEach((value, key) => {
    results += `${key}: ${value}${yamlFormats.newLine}`;
  });

  return results;
};

//// BELOW IS UNCONFIRMED TO BE CORRECT LOGIC

const nodeToMapDefinition = (node: MapNode, initIndent: string): string => {
  let mapDefinition = '';
  let indent = initIndent;

  if (node.loopSource) {
    mapDefinition = `${mapDefinition}${indent}${mapNodeParams.for}(${node.loopSource.loopSource}${
      node.loopSource.loopIndex ? `, ${node.loopSource.loopIndex}` : ''
    }):${yamlFormats.newLine}`;
    indent += yamlFormats.indentGap;
  }

  if (node.condition) {
    mapDefinition = `${mapDefinition}${indent}${mapNodeParams.if}(${node.condition.condition}):${yamlFormats.newLine}`;
    indent += yamlFormats.indentGap;
  }

  mapDefinition = `${mapDefinition}${indent}${node.targetNodeKey}:`;

  if (node.children && node.children.length > 0 && node.children.some((childNode) => keepNode(childNode))) {
    indent += yamlFormats.indentGap;

    mapDefinition = `${mapDefinition}${yamlFormats.newLine}`;

    if (node.targetValue) {
      mapDefinition = `${mapDefinition}${indent}${mapNodeParams.value}: ${node.targetValue.value}${yamlFormats.newLine}`;
    }

    for (const childNode of node.children) {
      if (keepNode(childNode)) {
        mapDefinition = `${mapDefinition}${nodeToMapDefinition(childNode, indent)}`;
      }
    }
  } else {
    if (node.targetValue) {
      mapDefinition = `${mapDefinition} ${node.targetValue.value}`;
    }

    mapDefinition = `${mapDefinition}${yamlFormats.newLine}`;
  }

  return mapDefinition;
};

const generateDataMap = (connections: ConnectionDictionary, sourceSchemaName: string, targetSchema: SchemaExtended): DataMap => {
  const fullDataMap = {
    srcSchemaName: sourceSchemaName,
    dstSchemaName: targetSchema.name,
    mappings: generateFullDataMapMapping(connections, targetSchema),
  };

  return fullDataMap;
};

const generateFullDataMapMapping = (connections: ConnectionDictionary, targetSchema: SchemaExtended): MapNode => {
  return generateFullChildDataMapMapping(connections, targetSchema.schemaTreeRoot);
};

const generateFullChildDataMapMapping = (connections: ConnectionDictionary, node: SchemaNodeExtended): MapNode => {
  const currentConnectionEntry = Object.entries(connections).find(
    ([_connectionKey, connectionValue]) => connectionValue.destination === node.key
  );
  const splitNodeKey = node.key.split('/');

  return {
    targetNodeKey: splitNodeKey[splitNodeKey.length - 1],
    children: node.children.map((childNode) => generateFullChildDataMapMapping(connections, childNode)),
    targetValue: currentConnectionEntry ? { value: currentConnectionEntry[1].sourceValue } : undefined,
    //loopSource: currentConnectionEntry?.loop ? { ...currentConnection.loop } : undefined, // TODO Loops
    //condition: currentConnectionEntry?.condition ? { condition: currentConnection.condition } : undefined, // TODO Conditions
  };
};

const keepNode = (node: MapNode): boolean => {
  return (
    (node.children && node.children.length > 0 && node.children.some((child) => keepNode(child))) ||
    !!node.condition ||
    !!node.loopSource ||
    !!node.targetValue
  );
};

export const convertFromMapDefinition = (mapDefinition: string): ConnectionDictionary => {
  const connections: ConnectionDictionary = {};
  const formattedMapDefinition = mapDefinition.replaceAll('\t', yamlFormats.indentGap);
  const parsedYaml: any = yaml.load(formattedMapDefinition);
  const parsedYamlKeys: string[] = Object.keys(parsedYaml);

  const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

  if (rootNodeKey) {
    parseMappingsJsonToNode(rootNodeKey, parsedYaml[rootNodeKey], rootNodeKey, connections);
  }

  return connections;
};

const parseMappingsJsonToNode = (
  sourceNodeKey: string,
  sourceNodeObject: string | object | any,
  targetKey: string,
  connections: ConnectionDictionary
) => {
  // Basic leaf node
  if (typeof sourceNodeObject === 'string') {
    const connectionKey = generateConnectionKey(sourceNodeObject, targetKey);
    connections[connectionKey] = {
      destination: targetKey,
      sourceValue: sourceNodeObject,
      loop: undefined,
      condition: undefined,
      // Needs to be addressed again once we have functions properly coded out in the designer
      reactFlowSource: `${inputPrefix}${sourceNodeObject}`,
      reactFlowDestination: `${outputPrefix}${targetKey}`,
    };

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
    parseMappingsJsonToNode(`${childrenKeys[0]}`, sourceNodeObject[childrenKeys[0]], newTargetKey, connections);

    // TODO (#15388621) revisit this once we've got loops and conditionals enabled in the designer to double check all the logic
    const newConnectionKey = generateConnectionKey(sourceNodeKey, newTargetKey);
    if (connections[newConnectionKey]) {
      connections[newConnectionKey].loop = startsWithFor ? parseLoopMapping(sourceNodeKey) : undefined;
      connections[newConnectionKey].condition = startsWithIf ? parseConditionalMapping(sourceNodeKey) : undefined;
    }

    return;
  }

  const targetValue = sourceNodeObject?.[mapNodeParams.value];

  for (const childKey in sourceNodeObject) {
    if (childKey !== mapNodeParams.value) {
      parseMappingsJsonToNode(childKey, sourceNodeObject[childKey], `${targetKey}/${childKey}`, connections);
    }
  }

  // TODO (#15388621) revisit this once we've got loops and conditionals enabled in the designer to double check all the logic
  if (targetValue) {
    const connectionKey = generateConnectionKey(sourceNodeKey, targetKey);
    connections[connectionKey] = {
      destination: targetKey,
      sourceValue: targetValue,
      loop: undefined,
      condition: undefined,
      reactFlowSource: `${inputPrefix}${targetValue}`,
      reactFlowDestination: `${outputPrefix}${targetKey}`,
    };
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

export const generateConnectionKey = (sourceKey: string, targetKey: string): string => `${sourceKey}-to-${targetKey}`;

/* eslint-disable no-param-reassign */
import { MapDefinitionKeys, mapDefinitionVersion, MapNodeParams, YamlFormats } from '../constants/MapDefinitionConstants';
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
  let mapDefinitionHeader = `${MapDefinitionKeys.Version}: ${mapDefinitionVersion}${YamlFormats.newLine}`;
  mapDefinitionHeader += `${MapDefinitionKeys.SourceFormat}: ${sourceSchema.type}${YamlFormats.newLine}`;
  mapDefinitionHeader += `${MapDefinitionKeys.TargetFormat}: ${targetSchema.type}${YamlFormats.newLine}`;
  mapDefinitionHeader += `${MapDefinitionKeys.SourceSchemaName}: ${targetSchema.name}${YamlFormats.newLine}`;
  mapDefinitionHeader += `${MapDefinitionKeys.TargetSchemaName}: ${targetSchema.name}${YamlFormats.newLine}`;

  if (sourceSchema.namespaces && sourceSchema.namespaces.size > 0) {
    mapDefinitionHeader += `${MapDefinitionKeys.SourceNamespaces}:${YamlFormats.newLine}`;
    mapDefinitionHeader += generateNamespaceEntries(sourceSchema.namespaces);
  }

  if (targetSchema.namespaces && targetSchema.namespaces.size > 0) {
    mapDefinitionHeader += `${MapDefinitionKeys.TargetNamespaces}:${YamlFormats.newLine}`;
    mapDefinitionHeader += generateNamespaceEntries(targetSchema.namespaces);
  }

  return mapDefinitionHeader;
};

const generateNamespaceEntries = (namespaces: Map<string, string>): string => {
  let results = '';
  namespaces.forEach((value, key) => {
    results += `${key}: ${value}${YamlFormats.newLine}`;
  });

  return results;
};

//// BELOW IS UNCONFIRMED TO BE CORRECT LOGIC

const nodeToMapDefinition = (node: MapNode, initIndent: string): string => {
  let mapDefinition = '';
  let indent = initIndent;

  if (node.loopSource) {
    mapDefinition = `${mapDefinition}${indent}${MapNodeParams.For}(${node.loopSource.loopSource}${
      node.loopSource.loopIndex ? `, ${node.loopSource.loopIndex}` : ''
    }):${YamlFormats.newLine}`;
    indent += YamlFormats.indentGap;
  }

  if (node.condition) {
    mapDefinition = `${mapDefinition}${indent}${MapNodeParams.If}(${node.condition.condition}):${YamlFormats.newLine}`;
    indent += YamlFormats.indentGap;
  }

  mapDefinition = `${mapDefinition}${indent}${node.targetNodeKey}:`;

  if (node.children && node.children.length > 0 && node.children.some((childNode) => keepNode(childNode))) {
    indent += YamlFormats.indentGap;

    mapDefinition = `${mapDefinition}${YamlFormats.newLine}`;

    if (node.targetValue) {
      mapDefinition = `${mapDefinition}${indent}${MapNodeParams.Value}: ${node.targetValue.value}${YamlFormats.newLine}`;
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

    mapDefinition = `${mapDefinition}${YamlFormats.newLine}`;
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
  const formattedMapDefinition = mapDefinition.replaceAll('\t', YamlFormats.indentGap);
  const parsedYaml: any = yaml.load(formattedMapDefinition);
  const parsedYamlKeys: string[] = Object.keys(parsedYaml);

  if (parsedYamlKeys[0] !== MapDefinitionKeys.SourceSchemaName || parsedYamlKeys[1] !== MapDefinitionKeys.TargetSchemaName) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME, InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
  }

  const targetNodeKey: string = parsedYamlKeys[2];

  if (targetNodeKey) {
    parseMappingsJsonToNode(targetNodeKey, parsedYaml[targetNodeKey], targetNodeKey, connections);
  }

  return connections;
};

const parseMappingsJsonToNode = (
  targetNodeKey: string,
  targetNodeObject: string | object | any,
  connectionKey: string,
  connections: ConnectionDictionary
) => {
  // Basic leaf node
  if (typeof targetNodeObject === 'string') {
    connections[connectionKey] = {
      destination: connectionKey,
      sourceValue: targetNodeObject,
      loop: undefined,
      condition: undefined,
      // Needs to be addressed again once we have functions properly coded out in the designer
      reactFlowSource: `${inputPrefix}${targetNodeObject}`,
      reactFlowDestination: `${outputPrefix}${connectionKey}`,
    };

    return;
  }

  const startsWithFor = targetNodeKey.startsWith(MapNodeParams.For);
  const startsWithIf = targetNodeKey.startsWith(MapNodeParams.If);

  if (startsWithFor || startsWithIf) {
    const childrenKeys = Object.keys(targetNodeObject);
    if (childrenKeys.length !== 1) {
      throw new InvalidFormatException(
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM,
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM
      );
    }

    const newConnectionKey = `${connectionKey}/${childrenKeys[0]}`;
    parseMappingsJsonToNode(`${childrenKeys[0]}`, targetNodeObject[childrenKeys[0]], newConnectionKey, connections);

    // TODO (#15388621) revisit this once we've got loops and conditionals enabled in the designer to double check all the logic
    if (connections[newConnectionKey]) {
      connections[newConnectionKey].loop = startsWithFor ? parseLoopMapping(targetNodeKey) : undefined;
      connections[newConnectionKey].condition = startsWithIf ? parseConditionalMapping(targetNodeKey) : undefined;
    }

    return;
  }

  const targetValue = targetNodeObject?.[MapNodeParams.Value];

  for (const childKey in targetNodeObject) {
    if (childKey !== MapNodeParams.Value) {
      parseMappingsJsonToNode(childKey, targetNodeObject[childKey], `${connectionKey}/${childKey}`, connections);
    }
  }

  // TODO (#15388621) revisit this once we've got loops and conditionals enabled in the designer to double check all the logic
  if (targetValue) {
    connections[connectionKey] = {
      destination: connectionKey,
      sourceValue: targetValue,
      loop: undefined,
      condition: undefined,
      reactFlowSource: `${inputPrefix}${targetValue}`,
      reactFlowDestination: `${outputPrefix}${connectionKey}`,
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

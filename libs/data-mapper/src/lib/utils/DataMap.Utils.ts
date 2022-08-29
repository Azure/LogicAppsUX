import { MapDefinitionProperties, MapNodeParams, YamlFormats } from '../constants/MapDefinitionConstants';
import type { Connection } from '../models/Connection';
import type { DataMap, MapNode } from '../models/DataMap';
import type { SchemaExtended, SchemaNodeExtended } from '../models/Schema';

export const convertToMapDefinition = (
  connections: { [key: string]: Connection },
  inputSchema: SchemaExtended,
  outputSchema: SchemaExtended
): string => {
  const dataMap = generateDataMap(connections, inputSchema.name, outputSchema);

  const codeDetails = `${MapDefinitionProperties.SourceSchema}: ${dataMap?.srcSchemaName ?? ''}${YamlFormats.newLine}${
    MapDefinitionProperties.TargetSchema
  }: ${dataMap?.dstSchemaName ?? ''}${YamlFormats.newLine}`;

  const mapDefinition = keepNode(dataMap.mappings) ? `${codeDetails}${nodeToMapDefinition(dataMap.mappings, '').trim()}` : codeDetails;
  return mapDefinition;
};

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

  if (node.children && node.children.length > 0) {
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

const generateDataMap = (connections: { [key: string]: Connection }, inputSchemaName: string, outputSchema: SchemaExtended): DataMap => {
  const fullDataMap = {
    srcSchemaName: inputSchemaName,
    dstSchemaName: outputSchema.name,
    mappings: generateFullDataMapMapping(connections, outputSchema),
  };

  return fullDataMap;
};

const generateFullDataMapMapping = (connections: { [key: string]: Connection }, outputSchema: SchemaExtended): MapNode => {
  return generateFullChildDataMapMapping(connections, outputSchema.schemaTreeRoot);
};

const generateFullChildDataMapMapping = (connections: { [key: string]: Connection }, node: SchemaNodeExtended): MapNode => {
  const connectionKeys = Object.keys(connections);
  const currentConnectionKey = connectionKeys.find((key) => key === node.key);
  const currentConnection = currentConnectionKey ? connections[currentConnectionKey] : undefined;
  const splitNodeKey = node.key.split('/');

  return {
    targetNodeKey: splitNodeKey[splitNodeKey.length - 1],
    children: node.children.map((childNode) => generateFullChildDataMapMapping(connections, childNode)),
    targetValue: currentConnection ? { value: currentConnection.value } : undefined,
    loopSource: currentConnection?.loop ? { ...currentConnection.loop } : undefined,
    condition: currentConnection?.condition ? { condition: currentConnection.condition } : undefined,
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

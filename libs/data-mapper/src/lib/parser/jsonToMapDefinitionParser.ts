import type { JsonInputStyle, MapNode } from '../models/DataMap';
import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import { MapDefinitionProperties, MapNodeParams, YamlFormats } from './utils/constants';

export function jsonToMapDefinition(inputJson: JsonInputStyle): string {
  if (!inputJson?.srcSchemaName || !inputJson?.dstSchemaName) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME, InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
  } else if (!inputJson?.mappings) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }

  const codeDetails = `${MapDefinitionProperties.SourceSchema}: ${inputJson?.srcSchemaName ?? ''}${YamlFormats.newLine}${
    MapDefinitionProperties.TargetSchema
  }: ${inputJson?.dstSchemaName ?? ''}${YamlFormats.newLine}`;

  return `${codeDetails}${nodeToMapDefinition(inputJson.mappings, '').trim()}`;
}
function nodeToMapDefinition(node: MapNode, indent: string): string {

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

  if (node.children) {
    indent += YamlFormats.indentGap;

    mapDefinition = `${mapDefinition}${YamlFormats.newLine}`;

    if (node.targetValue) {
      mapDefinition = `${mapDefinition}${indent}${MapNodeParams.Value}: ${node.targetValue.value}${YamlFormats.newLine}`;
    }

    for (const childNode of node.children) {
      mapDefinition = `${mapDefinition}${nodeToMapDefinition(childNode, indent)}`;
    }
  } else {
    if (node.targetValue) {
      mapDefinition = `${mapDefinition} ${node.targetValue.value}`;
    }

    mapDefinition = `${mapDefinition}${YamlFormats.newLine}`;
  }

  return mapDefinition;
}

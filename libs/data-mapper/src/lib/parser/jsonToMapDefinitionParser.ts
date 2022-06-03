import type { JsonInputStyle, MapNode } from '../models/DataMap';
import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';

export function jsonToMapDefinition(inputJson: JsonInputStyle): string {
  if (!inputJson?.srcSchemaName || !inputJson?.dstSchemaName || !inputJson?.mappings) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }

  const codeDetails = `$sourceSchema: ${inputJson?.srcSchemaName ?? ''}\n$targetSchema: ${inputJson?.dstSchemaName ?? ''}\n`;

  return `${codeDetails}${nodeToMapDefinition(inputJson.mappings, '').trim()}`;
}

function nodeToMapDefinition(node: MapNode, indent: string): string {
  let mapDefinition = '';

  if (node.loopSource) {
    mapDefinition = `${mapDefinition}${indent}$for(${node.loopSource.loopSource}${
      node.loopSource.loopIndex ? `, ${node.loopSource.loopIndex}` : ''
    }):\n`;
    indent += '  ';
  }

  if (node.condition) {
    mapDefinition = `${mapDefinition}${indent}$if(${node.condition.condition}):\n`;
    indent += '  ';
  }

  mapDefinition = `${mapDefinition}${indent}${node.targetNodeKey}:`;

  if (node.children) {
    indent += '  ';

    mapDefinition = `${mapDefinition}\n`;

    if (node.targetValue) {
      mapDefinition = `${mapDefinition}${indent}$value: ${node.targetValue.value}\n`;
    }

    for (const childNode of node.children) {
      mapDefinition = `${mapDefinition}${nodeToMapDefinition(childNode, indent)}`;
    }
  } else {
    if (node.targetValue) {
      mapDefinition = `${mapDefinition} ${node.targetValue.value}`;
    }

    mapDefinition = `${mapDefinition}\n`;
  }

  return mapDefinition;
}

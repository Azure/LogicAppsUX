import type { JsonInputStyle, MapNode } from '../models/DataMap';
import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';

export function jsonToMapDefinition(inputJson: JsonInputStyle): string {
  const codeDetails = `sourceSchema: ${inputJson?.srcSchemaName ?? ''}\ntargetSchema: ${inputJson?.dstSchemaName ?? ''}\n`;

  if (!inputJson.mappings) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }

  return `${codeDetails}${nodeToMapDefinition(inputJson.mappings, '', '', '')}`;
}

function nodeToMapDefinition(node: MapNode, indent: string, parentNodeKey: string, parentLoopSource: string): string {
  let mapDefinition = '';

  if (node.loopSource) {
    mapDefinition = `${mapDefinition}${indent}for(${removeNodeKey(node.loopSource.loopSource, parentNodeKey, parentLoopSource)}):\n`;
    indent += '\t';
  }

  if (node.condition) {
    mapDefinition = `${mapDefinition}${indent}if(${removeNodeKey(node.condition.condition, parentNodeKey, parentLoopSource)}):\n`;
    indent += '\t';
  }

  mapDefinition = `${mapDefinition}${indent}${removeNodeKey(node.targetNodeKey, parentNodeKey, parentLoopSource)}:`;

  if (node.targetValue) {
    mapDefinition = `${mapDefinition} ${removeNodeKey(node.targetValue.value, parentNodeKey, parentLoopSource)}`;
  }

  mapDefinition = mapDefinition.concat('\n');

  if (node.children) {
    indent += '\t';
    for (const childNode of node.children) {
      mapDefinition = `${mapDefinition}${nodeToMapDefinition(
        childNode,
        indent,
        node.targetNodeKey,
        node?.loopSource?.loopSource ?? parentLoopSource
      )}`;
    }
  }

  return mapDefinition;
}

export function removeNodeKey(str: string, nodeKey: string, loopSource: string) {
  return str?.replaceAll(`${nodeKey}/`, '')?.replaceAll(`${loopSource}`, '');
}

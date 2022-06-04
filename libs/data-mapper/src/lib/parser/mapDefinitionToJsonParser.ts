import type { MapNode, ConditionalMapping, JsonInputStyle, LoopMapping } from '../models';
import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import yaml from 'js-yaml';

export function mapDefinitionToJson(inputMapDefinition: string): JsonInputStyle {
  const formattedInputMapDefinition = inputMapDefinition.replaceAll('\t', '  ');
  const parsedYaml: any = yaml.load(formattedInputMapDefinition);
  const parsedYamlKeys: string[] = Object.keys(parsedYaml);

  if (parsedYamlKeys[0] !== '$sourceSchema' || parsedYamlKeys[1] !== '$targetSchema') {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME, InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
  }

  const targetNodeKey: string = parsedYamlKeys[2];

  const sourceSchema: string = parsedYaml.$sourceSchema;
  const targetSchema: string = parsedYaml.$targetSchema;

  const mappings: MapNode = parseMappingsJsonToNode(targetNodeKey, parsedYaml[targetNodeKey]);

  return {
    srcSchemaName: sourceSchema,
    dstSchemaName: targetSchema,
    mappings: mappings,
  };
}

function parseMappingsJsonToNode(targetNodeKey: string, targetNodeObject: string | object | any): MapNode {
  if (typeof targetNodeObject === 'string') {
    return {
      targetNodeKey: targetNodeKey,
      targetValue: {
        value: targetNodeObject,
      },
    };
  }

  const startsWithFor = targetNodeKey.startsWith('$for'),
    startsWithIf = targetNodeKey.startsWith('$if');

  if (startsWithFor || startsWithIf) {
    const childrenKeys = Object.keys(targetNodeObject);
    if (childrenKeys.length !== 1) {
      throw new InvalidFormatException(
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM,
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM
      );
    }

    const parsedNode = parseMappingsJsonToNode(`${childrenKeys[0]}`, targetNodeObject[childrenKeys[0]]);

    parsedNode.loopSource = startsWithFor ? parseLoopMapping(targetNodeKey) : undefined;
    parsedNode.condition = startsWithIf ? parseConditionalMapping(targetNodeKey) : undefined;

    return parsedNode;
  }

  const targetValue = targetNodeObject?.$value ? { value: targetNodeObject.$value } : undefined;

  const childrenNode: MapNode[] = [];
  for (const childKey in targetNodeObject) {
    if (childKey !== '$value') {
      childrenNode.push(parseMappingsJsonToNode(childKey, targetNodeObject[childKey]));
    }
  }

  return {
    targetNodeKey: targetNodeKey,
    children: childrenNode,
    targetValue: targetValue,
  };
}

export function parseLoopMapping(line: string): LoopMapping {
  const formttedLine = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim();
  const expressionSplittedOnComma = formttedLine?.split(',');
  return {
    loopSource: expressionSplittedOnComma?.[0]?.trim(),
    loopIndex: expressionSplittedOnComma?.[1]?.trim(),
  };
}

export function parseConditionalMapping(line: string): ConditionalMapping {
  return {
    condition: line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim(),
  };
}

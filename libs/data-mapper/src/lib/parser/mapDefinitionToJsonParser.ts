import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import type { ConditionalMapping, JsonInputStyle, LoopMapping, Node } from './types';
import yaml from 'js-yaml';

export async function parseYamlToJson(inputMapDefinition: string): Promise<JsonInputStyle> {
  try {
    const parsedYaml: any = yaml.load(inputMapDefinition);
    const parsedYamlKeys: string[] = Object.keys(parsedYaml);

    if (parsedYamlKeys[0] !== 'sourceSchema' || parsedYamlKeys[1] !== 'targetSchema') {
      throw new InvalidFormatException(
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM,
        InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM
      );
    }

    const targetNodeKey: string = parsedYamlKeys[2];

    const sourceSchema: string = parsedYaml.sourceSchema;
    const targetSchema: string = parsedYaml.targetSchema;

    const mappings: Node = parsedMappingsToNodeFormat(targetNodeKey, parsedYaml[targetNodeKey]);

    return {
      srcSchemaName: sourceSchema,
      dstSchemaName: targetSchema,
      mappings: mappings,
    };
  } catch (e) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }
}

export function parsedMappingsToNodeFormat(targetNodeKey: string, targetNodeObject: string | object | any): Node {
  if (typeof targetNodeObject === 'string') {
    return {
      targetNodeKey: targetNodeKey,
      targetValue: {
        value: targetNodeObject,
      },
    };
  } else {
    let curTargetNodeKey = targetNodeKey,
      curTargetNodeObject = targetNodeObject;
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
      curTargetNodeKey = childrenKeys[0];
      curTargetNodeObject = targetNodeObject[childrenKeys[0]];
    }

    const curTargetValue = curTargetNodeObject.$value ? { value: curTargetNodeObject.$value } : undefined;
    const loopSource = startsWithFor ? parseLoopMapping(targetNodeKey) : undefined;
    const condition = startsWithIf ? parseConditionalMapping(targetNodeKey) : undefined;

    const childrenNode: Node[] = [];
    for (const childKey in curTargetNodeObject) {
      if (childKey !== '$value') {
        childrenNode.push(parsedMappingsToNodeFormat(childKey, curTargetNodeObject[childKey]));
      }
    }

    return {
      targetNodeKey: curTargetNodeKey,
      children: childrenNode,
      targetValue: curTargetValue,
      loopSource: loopSource,
      condition: condition,
    };
  }
}

function parseLoopMapping(line: string): LoopMapping {
  const formttedLine = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim();
  return {
    loopSource: formttedLine.split(',')?.[0]?.trim(),
    loopIndex: formttedLine.split(',')?.[1]?.trim(),
  };
}

function parseConditionalMapping(line: string): ConditionalMapping {
  return {
    condition: line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim(),
  };
}

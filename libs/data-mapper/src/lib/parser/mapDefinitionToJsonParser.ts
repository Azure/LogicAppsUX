import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import type { ConditionalMapping, JsonInputStyle, LoopMapping, Node } from './types';
import yaml from 'js-yaml';

export async function mapDefinitionToJson(inputMapDefinition: string): Promise<JsonInputStyle> {
  try {
    const formattedInputMapDefinition = inputMapDefinition.replace('\t', '  ');
    const parsedYaml: any = yaml.load(formattedInputMapDefinition);
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

    const mappings: Node = parseMappingsJsonToNode(targetNodeKey, parsedYaml[targetNodeKey]);

    return {
      srcSchemaName: sourceSchema,
      dstSchemaName: targetSchema,
      mappings: mappings,
    };
  } catch (e) {
    console.log(e);
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }
}

function parseMappingsJsonToNode(targetNodeKey: string, targetNodeObject: string | object | any): Node {
  if (typeof targetNodeObject === 'string') {
    return {
      targetNodeKey: targetNodeKey,
      targetValue: {
        value: targetNodeObject,
      },
    };
  } else {
    const curTargetNodeKey = targetNodeKey,
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

      if (startsWithFor) {
        const parsedNode = parseMappingsJsonToNode(`${childrenKeys[0]}`, curTargetNodeObject[childrenKeys[0]]);
        parsedNode.loopSource = parseLoopMapping(targetNodeKey);
        return parsedNode;
      } else {
        const parsedNode = parseMappingsJsonToNode(`${childrenKeys[0]}`, curTargetNodeObject[childrenKeys[0]]);
        parsedNode.condition = parseConditionalMapping(targetNodeKey);
        return parsedNode;
      }
    }

    const curTargetValue = curTargetNodeObject?.$value ? { value: curTargetNodeObject.$value } : undefined;

    const childrenNode: Node[] = [];
    for (const childKey in curTargetNodeObject) {
      if (childKey !== '$value') {
        childrenNode.push(parseMappingsJsonToNode(childKey, curTargetNodeObject[childKey]));
      }
    }

    return {
      targetNodeKey: curTargetNodeKey,
      children: childrenNode,
      targetValue: curTargetValue,
    };
  }
}

export function parseLoopMapping(line: string): LoopMapping {
  const formttedLine = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim();
  return {
    loopSource: formttedLine.split(',')?.[0]?.trim(),
    loopIndex: formttedLine.split(',')?.[1]?.trim(),
  };
}

export function parseConditionalMapping(line: string): ConditionalMapping {
  return {
    condition: line.substring(line.indexOf('(') + 1, line.lastIndexOf(')')).trim(),
  };
}

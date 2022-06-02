import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import type { JsonInputStyle, Node } from './types';
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

    const inputJsonInputStyle: JsonInputStyle = {
      srcSchemaName: sourceSchema,
      dstSchemaName: targetSchema,
      mappings: mappings,
    };

    return inputJsonInputStyle;
  } catch (e) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }
  // return '';
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
    const loopSource = startsWithFor ? { loopSource: targetNodeKey } : undefined;
    const condition = startsWithIf ? { condition: targetNodeKey } : undefined;

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

function hasTargetValue(line: string): boolean {
  return line?.split(': ')?.length === 2;
}

function getTargetNodeKey(line: string): string {
  //TODO: split line with ":" (be careful) and get the first - fix the way of filtering out \t
  return line?.split(':')?.[0]?.trim();
}

function getTargetNodeValue(line: string): string {
  return line.substring(line.indexOf(':') + 1).trim();
}

function getCurNodeLevel(line: string): number {
  return (line?.split('\t')?.length ?? 0) - 1;
}

function isDirectChild(curNodeLevel: number, parentNodeLevel: number): boolean {
  return curNodeLevel === parentNodeLevel + 1;
}

function removeConditionLoop(line: string): string {
  //TODO: get rid of "for()" for "if()"
  return line.trim();
}

function isCurrentIndexInRange(curIndex: number, linesLength: number): boolean {
  return curIndex < linesLength;
}

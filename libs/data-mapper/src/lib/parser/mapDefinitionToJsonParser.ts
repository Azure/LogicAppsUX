import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import type { JsonInputStyle, LoopMapping, Node } from './types';
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

    console.log(parsedYaml[targetNodeKey]);

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
  // console.log(targetNodeKey, " : ", inputMappingsObject);

  if (typeof targetNodeObject === 'string') {
    return {
      targetNodeKey: targetNodeKey,
      targetValue: {
        value: targetNodeObject,
      },
    };
  } else {
    //TODO
    if (targetNodeKey.startsWith('$for')) {
      const childrenKeys = Object.keys(targetNodeObject);
      if (childrenKeys.length !== 1) {
        throw new InvalidFormatException(
          InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM,
          InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM
        );
      } else {
        const loopSource = targetNodeKey;
        const newTargetNodeKey = childrenKeys[0];
        const newTargetNodeObject = targetNodeObject[childrenKeys[0]];
        const targetValue = newTargetNodeObject.$value
          ? {
              value: newTargetNodeObject.$value,
            }
          : undefined;

        const childrenNode: Node[] = [];
        for (const childKey in newTargetNodeObject) {
          if (childKey !== '$value') {
            childrenNode.push(parsedMappingsToNodeFormat(childKey, newTargetNodeObject[childKey]));
          }
        }
        return {
          loopSource: {
            loopSource: loopSource,
          },
          targetNodeKey: newTargetNodeKey,
          children: childrenNode,
          targetValue: targetValue,
        };
      }
    } else if (targetNodeKey.startsWith('$if')) {
      const childrenKeys = Object.keys(targetNodeObject);
      if (childrenKeys.length !== 1) {
        throw new InvalidFormatException(
          InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM,
          InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM
        );
      } else {
        const condition = targetNodeKey;
        const newTargetNodeKey = childrenKeys[0];
        const newTargetNodeObject = targetNodeObject[childrenKeys[0]];
        const targetValue = newTargetNodeObject.$value
          ? {
              value: newTargetNodeObject.$value,
            }
          : undefined;

        const childrenNode: Node[] = [];
        for (const childKey in newTargetNodeObject) {
          if (childKey !== '$value') {
            childrenNode.push(parsedMappingsToNodeFormat(childKey, newTargetNodeObject[childKey]));
          }
        }
        return {
          condition: {
            condition: condition,
          },
          targetNodeKey: newTargetNodeKey,
          children: childrenNode,
          targetValue: targetValue,
        };
      }
    } else {
      const childrenNode: Node[] = [];
      for (const childKey in targetNodeObject) {
        if (childKey !== '$value') {
          childrenNode.push(parsedMappingsToNodeFormat(childKey, targetNodeObject[childKey]));
        }
      }
      return {
        targetNodeKey: targetNodeKey,
        children: childrenNode,
      };
    }
  }

  return {
    targetNodeKey: '',
  };
}

export function mapDefinitionToJson(inputMapDefinition: string): JsonInputStyle {
  const mapDefinitionLines = inputMapDefinition?.split('\n');
  const hasSourceSchema = mapDefinitionLines?.[0]?.startsWith('sourceSchema');
  const hasTargetSchema = hasSourceSchema
    ? mapDefinitionLines?.[1]?.startsWith('targetSchema')
    : mapDefinitionLines?.[0]?.startsWith('targetSchema');
  const mappingsStartIndex = hasSourceSchema && hasTargetSchema ? 2 : hasSourceSchema || hasTargetSchema ? 1 : 0;

  return {
    srcSchemaName: hasSourceSchema ? getTargetNodeValue(mapDefinitionLines?.[0]) : undefined,
    dstSchemaName: hasTargetSchema
      ? hasSourceSchema
        ? getTargetNodeValue(mapDefinitionLines?.[1])
        : getTargetNodeValue(mapDefinitionLines?.[0])
      : undefined,
    mappings: linesToNode(mapDefinitionLines, mappingsStartIndex),
  };
}

let _lines: string[];
let _linesLength: number;

export function linesToNode(mapDefinitionLines: string[], startIndex: number): Node {
  const dummy: Node = { targetNodeKey: '' };
  _lines = mapDefinitionLines;
  _linesLength = _lines.length;

  _lineToNode(dummy, -1, startIndex);
  return dummy?.children?.[0] ?? dummy;
}

function _lineToNode(parentNode: Node, parentNodeLevel: number, startingIndex: number): number {
  let curIndex = startingIndex;

  while (isCurrentIndexInRange(curIndex, _linesLength)) {
    let curLine = _lines[curIndex];
    let curNodeLevel = getCurNodeLevel(curLine);

    if (!isDirectChild(curNodeLevel, parentNodeLevel)) {
      return curIndex;
    }

    // if (hasTargetValue(curLine)) {
    //   const node: Node = {
    //     targetNodeKey: getTargetNodeKey(curLine),
    //     targetValue: {
    //       value: getTargetNodeValue(curLine),
    //     },
    //   };

    //   if (parentNode.children) {
    //     parentNode.children.push(node);
    //   } else {
    //     parentNode.children = [node];
    //   }

    //   curIndex++;
    // } else {
    const startsWithFor = getTargetNodeKey(curLine).startsWith('for');
    const startsWithIf = getTargetNodeKey(curLine).startsWith('if');

    let loopSource = undefined;
    let condition = undefined;

    if (startsWithFor || startsWithIf) {
      if (startsWithFor) {
        loopSource = { loopSource: removeConditionLoop(curLine) };

        curIndex++;
        curLine = _lines[curIndex];
        curNodeLevel = getCurNodeLevel(curLine);
      } else {
        condition = { condition: removeConditionLoop(curLine) };
      }
    }

    const targetValue = getTargetNodeValue(curLine) === '' ? undefined : { value: getTargetNodeValue(curLine) };

    const node: Node = {
      targetNodeKey: getTargetNodeKey(curLine),
      loopSource: loopSource,
      condition: condition,
      targetValue: targetValue,
    };

    if (parentNode.children) {
      parentNode.children.push(node);
    } else {
      parentNode.children = [node];
    }

    curIndex++;

    let nextNodeLevel = getCurNodeLevel(_lines[curIndex]);

    while (isCurrentIndexInRange(curIndex, _linesLength) && isDirectChild(nextNodeLevel, curNodeLevel)) {
      const nextIndex = _lineToNode(node, curNodeLevel, curIndex);
      curIndex = nextIndex;
      nextNodeLevel = getCurNodeLevel(_lines[curIndex]);
    }
    // }
    return curIndex;
  }

  // out of range
  return curIndex;
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

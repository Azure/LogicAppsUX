import type { JsonInputStyle, Node } from './types';

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

    if (hasTargetValue(curLine)) {
      const node: Node = {
        targetNodeKey: getTargetNodeKey(curLine),
        targetValue: {
          value: getTargetNodeValue(curLine),
        },
      };

      if (parentNode.children) {
        parentNode.children.push(node);
      } else {
        parentNode.children = [node];
      }

      curIndex++;
    } else {
      const startsWithFor = getTargetNodeKey(curLine).startsWith('for');
      const startsWithIf = getTargetNodeKey(curLine).startsWith('if');

      let loopSource = undefined;
      let condition = undefined;

      if (startsWithFor || startsWithIf) {
        if (startsWithFor) {
          loopSource = { loopSource: removeConditionLoop(curLine) };
        } else {
          condition = { condition: removeConditionLoop(curLine) };
        }
        curIndex++;
        curLine = _lines[curIndex];
        curNodeLevel = getCurNodeLevel(curLine);
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
    }
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

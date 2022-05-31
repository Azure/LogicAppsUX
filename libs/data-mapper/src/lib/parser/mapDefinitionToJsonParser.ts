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

export function linesToNode(mapDefinitionLines: string[], startIndex: number): Node {
  const dummy: Node = { targetNodeKey: '' };
  _lineToNode(mapDefinitionLines, dummy, -1, startIndex);
  return dummy?.children?.[0] ?? dummy;
}

function _lineToNode(lines: string[], parentNode: Node, parentNodeLevel: number, index: number): number {
  let curIndex = index;

  while (curIndex < lines?.length) {
    let curLine = lines[curIndex];
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
      let loopSource = undefined;
      let condition = undefined;

      if (getTargetNodeKey(curLine).startsWith('for') || getTargetNodeKey(curLine).startsWith('if')) {
        if (getTargetNodeKey(curLine).startsWith('for')) {
          loopSource = { loopSource: removeConditionLoop(curLine) };
        } else if (getTargetNodeKey(curLine).startsWith('if')) {
          condition = { condition: removeConditionLoop(curLine) };
        }
        curIndex++;
        curLine = lines[curIndex];
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

      let updatingNodeLevel = getCurNodeLevel(lines[curIndex]);

      while (curIndex < lines?.length && isDirectChild(updatingNodeLevel, curNodeLevel)) {
        const nextIndex = _lineToNode(lines, node, curNodeLevel, curIndex);
        curIndex = nextIndex;
        updatingNodeLevel = getCurNodeLevel(lines[curIndex]);
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

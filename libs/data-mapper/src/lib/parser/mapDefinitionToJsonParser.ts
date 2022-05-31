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
    const curLine = lines[curIndex];
    const curNodeLevel = getCurNodeLevel(curLine);
    if (isDirectChild(curNodeLevel, parentNodeLevel)) {
      const node: Node = {
        targetNodeKey: getTargetNodeKey(curLine),
      };
      if (hasTargetValue(curLine)) {
        node.targetValue = {
          value: getTargetNodeValue(curLine),
        };
        // const node: Node = {
        //   targetNodeKey: getTargetNodeKey(curLine),
        //   targetValue: {
        //     value: getTargetNodeValue(curLine),
        //   },
        // };

        if (parentNode.children) {
          parentNode.children.push(node);
        } else {
          parentNode.children = [node];
        }

        curIndex++;
        return curIndex;
      } else {
        // FOR LOOPSOURCE OR CONDITION
        if (curLine.startsWith('for')) {
          //TODO: forloop
        } else if (curLine.startsWith('if')) {
          //TODO: if
        }
        const node: Node = {
          targetNodeKey: getTargetNodeKey(curLine),
          // children: []
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
        return curIndex;
      }
    } else {
      return curIndex;
    }
  }

  // out of range
  return curIndex;
}

function hasTargetValue(line: string): boolean {
  return line?.split(': ')?.length === 2;
}

function getTargetNodeKey(line: string): string {
  //TODO: split line with ":" (be careful) and get the first - fix the way of filtering out \t
  return line?.split(':')?.[0]?.replaceAll('\t', '');
}

function getTargetNodeValue(line: string): string {
  //TODO: split line with ":" (be careful) and get the second
  return line.substring(line.indexOf(':') + 1);
}

function getCurNodeLevel(line: string): number {
  //TODO: split line with "\t" and find how many there are
  return (line?.split('\t')?.length ?? 0) - 1;
}

function isDirectChild(curNodeLevel: number, parentNodeLevel: number): boolean {
  return curNodeLevel === parentNodeLevel + 1;
}

function removeConditionLoop(line: string): string {
  //TODO: get rid of "for()" for "if()"
  return '';
}

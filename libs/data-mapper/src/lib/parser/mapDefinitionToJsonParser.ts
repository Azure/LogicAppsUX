import type { Node } from './types';

export function mapDefinitionToJson(inputMapDefinition: string): string {
  const mapcodeLines: string[] = inputMapDefinition.split('\n');

  for (const mapcodeLine of mapcodeLines) {
    const mapcodeLineSplit = mapcodeLine.split('\t');
    const lineExceptIndent = mapcodeLineSplit[mapcodeLineSplit.length - 1];

    console.log('--', mapcodeLineSplit.length, ' : ', lineExceptIndent);
  }

  return '';
}

// function mapDefinitionToNode()

function lineToNode(inputLine: string): Node | null {
  const inputLineSplited = inputLine.split(': ');

  // 1) TARGETNODEKEY
  // let node: Node = {
  //   targetNodeKey: inputLineSplited[0]
  // }

  // FOR LOOPSOURCE OR CONDITION
  if (inputLineSplited[0].startsWith('for')) {
    //TODO: forloop. make loopSource and targetNodeKey then recursion - actually recursion in another if
  } else if (inputLineSplited[0].startsWith('if')) {
    //TODO: forloop. make condition and targetNodeKey then recursion - actually recursion in another if.
  }

  // FOR TARGETNODEKEY - everylevel has targetNodeKey if not for or if.
  // TODO

  // 2) VALUE OR CHILDREN

  // FOR CHILDREN OR VALUE - if children, recursion; if targetValue, end of recursion.
  if (inputLineSplited.length == 1) {
    // need below
    return null;
  } else {
    // end of the node
    const node: Node = {
      targetNodeKey: inputLineSplited[0],
      targetValue: {
        value: inputLineSplited[1],
      },
    };

    return node;
  }
}

export function linesToNode(mapDefinition: string): any {
  const node: Node = { targetNodeKey: '' };
  _lineToNode(mapDefinition?.split('\n'), node, 0, 0);
  return node;
}

function _lineToNode(lines: string[], parentNode: Node, parentNodeLevel: number, index: number): number {
  let curIndex = index;

  while (curIndex < lines?.length) {
    // while still in range
    const curLine = lines[curIndex];
    const curNodeLevel = getCurNodeLevel(curLine);
    if (curNodeLevel === parentNodeLevel + 1) {
      //TODO: check - check if the curNodeLevel is parent's direct child
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
        // TODO - check if the below is correct - logic: moving to next line (in the possible same or upper level)
        curIndex++;
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

        // === need to double check
        if (parentNode.children) {
          parentNode.children.push(node);
        } else {
          parentNode.children = [node];
        }
        // ======

        curIndex++;
        const nextIndex = _lineToNode(lines, node, curNodeLevel, curIndex);
        curIndex = nextIndex;
      }
    } else {
      // TODO: check and fix this
      curIndex++;
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
  return line?.split('\t')?.length - 1;
}

function removeConditionLoop(line: string): string {
  //TODO: get rid of "for()" for "if()"
  return '';
}

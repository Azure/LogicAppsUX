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

import MapLexer from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapLexer';
import MapParser from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapParser';
import MapParserVisitor from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapParserVisitor';
import antlr from 'antlr4';

export interface inputStyle {
  srcSchemaName: string;
  dstSchemaName: string;
  mappings: Node;
}

export function jsonToMapcode(jsonObj: any): string {
  // let mapcode = "";
  // mapcode = mapcode.concat(jsonObj.srcSchemaName + ")\n");
  // mapcode = mapcode.concat(jsonObj.dstSchemaName + ")\n");

  return nodeToMapcode(jsonObj, '', '', '');
}

export interface Node {
  targetNodeKey: string;
  children?: Node[];
  targetValue?: { value: string };
  loopSource?: { loopSource: string };
  condition?: { condition: string };
}

export function nodeToMapcode(node: Node, indent: string, parentNodeKey: string, parentLoopSource: string): string {
  let mapcode = '';

  if (node.loopSource) {
    mapcode = mapcode.concat(indent + 'for(' + removeNodeKey(node.loopSource.loopSource, parentNodeKey, parentLoopSource) + '):\n');
    indent += '   ';
  }

  if (node.condition) {
    mapcode = mapcode.concat(indent + 'if(' + removeNodeKey(node.condition.condition, parentNodeKey, parentLoopSource) + '):\n');
    indent += '   ';
  }

  mapcode = mapcode.concat(indent + removeNodeKey(node.targetNodeKey, parentNodeKey, parentLoopSource) + ':');

  if (node.targetValue) {
    mapcode = mapcode.concat(' ' + removeNodeKey(node.targetValue.value, parentNodeKey, parentLoopSource));
  }

  mapcode = mapcode.concat('\n');

  if (node.children) {
    indent += '   ';
    for (const childNode of node.children) {
      mapcode = mapcode.concat(nodeToMapcode(childNode, indent, node.targetNodeKey, node?.loopSource?.loopSource ?? parentLoopSource));
    }
  }

  return mapcode;
}

export function removeNodeKey(str: string, nodeKey: string, loopSource: string) {
  return str?.replaceAll(nodeKey + '/', '')?.replaceAll(loopSource + '/', '');
}

export function tokenize(text: string) {
  const input = new antlr.InputStream(text);
  const lexer = new MapLexer(input);
  const tokens = new antlr.CommonTokenStream(lexer);
  const parser = new MapParser(tokens);

  // const tokenStream = new TokenRewriteStream(lexer);

  const mainContext = parser.main();

  const visitor = new MapParserVisitor();
  visitor.visitMain(mainContext);

  return parser;
}

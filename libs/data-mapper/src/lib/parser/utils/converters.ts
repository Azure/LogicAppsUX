import MapLexer from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapLexer';
import MapParser from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapParser';
import MapParserVisitor from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapParserVisitor';
import { InvalidFormatException, InvalidFormatExceptionCode } from './exceptions/invalidFormat';
import antlr from 'antlr4';

export interface JsonInputStyle {
  srcSchemaName?: string;
  dstSchemaName?: string;
  mappings: Node;
}

export function jsonToMapcode(inputInJson: JsonInputStyle): string {
  const codeDetails = `sourceSchema: ${inputInJson?.srcSchemaName ?? ''}\ntargetSchema: ${inputInJson?.dstSchemaName ?? ''}\n`;

  if (!inputInJson.mappings) {
    throw new InvalidFormatException(InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM, InvalidFormatExceptionCode.MISSING_MAPPINGS_PARAM);
  }

  return `${codeDetails}${nodeToMapcode(inputInJson.mappings, '', '', '')}`;
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
    mapcode = `${mapcode}${indent}for(${removeNodeKey(node.loopSource.loopSource, parentNodeKey, parentLoopSource)}):\n`;
    indent += '\t';
  }

  if (node.condition) {
    mapcode = `${mapcode}${indent}if(${removeNodeKey(node.condition.condition, parentNodeKey, parentLoopSource)}):\n`;
    indent += '\t';
  }

  mapcode = `${mapcode}${indent}${removeNodeKey(node.targetNodeKey, parentNodeKey, parentLoopSource)}:`;

  if (node.targetValue) {
    mapcode = `${mapcode} ${removeNodeKey(node.targetValue.value, parentNodeKey, parentLoopSource)}`;
  }

  mapcode = mapcode.concat('\n');

  if (node.children) {
    indent += '\t';
    for (const childNode of node.children) {
      mapcode = `${mapcode}${nodeToMapcode(childNode, indent, node.targetNodeKey, node?.loopSource?.loopSource ?? parentLoopSource)}`;
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

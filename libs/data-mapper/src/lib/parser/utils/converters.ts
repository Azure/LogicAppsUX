// import { InputStream, CommonTokenStream } from 'antlr4'; // works for jest, but doesn't compile
import MapLexer from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapLexer';
import MapParser from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapParser';
import MapParserVisitor from '../runtime/mapOM/mapOmAntlrParser/Antlr4Def/MapParserVisitor';
import antlr from 'antlr4';

export function convertJsonToMapCode(json: string): string {
  return json;
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

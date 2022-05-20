import MapLexer from '../definition/MapLexer';
import MapParser from '../definition/MapParser';
import MapParserVisitor from '../definition/MapParserVisitor';
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

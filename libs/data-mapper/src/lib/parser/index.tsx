import { CodeInputBox } from './components/CodeInputBox';
import { CodeOutputBox } from './components/CodeOutputBox';
import MapLexer from './definition/MapLexer.js';
import MapParser from './definition/MapParser.js';
import { convertJsonToYamlLike } from './utils/converters';
import antlr from 'antlr4';
import { useEffect, useState } from 'react';

export interface ParserViewProps {
  input: string;
}
export const ParserView = ({ input }: ParserViewProps) => {
  const [convertedOutput, setConvertedOutput] = useState(convertJsonToYamlLike(input));

  useEffect(() => {
    setConvertedOutput(convertJsonToYamlLike(input));
  }, [input]);

  return (
    <div>
      <CodeInputBox input={input} />
      <CodeOutputBox output={convertedOutput} />
    </div>
  );
};

export function tokenize(text: string) {
  const input = new antlr.InputStream(text);
  const lexer = new MapLexer(input);
  const tokens = new antlr.CommonTokenStream(lexer);
  const parser = new MapParser(tokens);

  // const tokenStream = new TokenRewriteStream(lexer);

  parser.main();
  return parser;
}

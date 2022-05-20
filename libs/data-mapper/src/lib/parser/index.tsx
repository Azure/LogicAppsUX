import { CodeInputBox } from './components/CodeInputBox';
import { CodeOutputBox } from './components/CodeOutputBox';
import { convertJsonToMapCode, tokenize } from './utils/converters';
import { useEffect, useState } from 'react';

export interface ParserViewProps {
  input: string;
}
export const ParserView = ({ input }: ParserViewProps) => {
  const [convertedOutput, setConvertedOutput] = useState(convertJsonToMapCode(input));

  useEffect(() => {
    setConvertedOutput(convertJsonToMapCode(input));
    tokenize(input);
  }, [input]);

  return (
    <div>
      <CodeInputBox input={input} />
      <CodeOutputBox output={convertedOutput} />
    </div>
  );
};

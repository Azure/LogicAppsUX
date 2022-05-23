import { CodeInputBox } from './components/CodeInputBox';
import { CodeOutputBox } from './components/CodeOutputBox';
import { jsonToMapcode } from './utils/converters';
import { useEffect, useState } from 'react';

export interface ParserViewProps {
  input: string;
}
export const ParserView = ({ input }: ParserViewProps) => {
  const [convertedOutput, setConvertedOutput] = useState(jsonToMapcode(JSON.parse(input)));

  useEffect(() => {
    setConvertedOutput(jsonToMapcode(JSON.parse(input)));
  }, [input]);

  return (
    <div>
      <CodeInputBox input={input} />
      <CodeOutputBox output={convertedOutput} />
    </div>
  );
};

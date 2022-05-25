import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapcode } from './jsonToMapcodeParser';
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
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

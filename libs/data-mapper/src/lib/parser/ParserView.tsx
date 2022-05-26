import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapDefinition } from './jsonToMapDefinitionParser';
import { mapDefinitionToJson } from './mapDefinitionToJsonParser';
import { useEffect, useState } from 'react';

export interface ParserViewProps {
  input: string;
}
export const ParserView = ({ input }: ParserViewProps) => {
  const [convertedOutput, setConvertedOutput] = useState(jsonToMapDefinition(JSON.parse(input)));

  useEffect(() => {
    setConvertedOutput(jsonToMapDefinition(JSON.parse(input)));

    mapDefinitionToJson(convertedOutput);
  }, [input]);

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapDefinition } from './jsonToMapDefinitionParser';
import { mapDefinitionToJson } from './mapDefinitionToJsonParser';
import { useEffect, useState } from 'react';

export interface ParserViewProps {
  input: string;
}
export const JsonToMapParserView = ({ input }: ParserViewProps) => {
  const convertedOutput = jsonToMapDefinition(JSON.parse(input));

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

export const MapToJsonParserView = ({ input }: ParserViewProps) => {
  const [convertedOutput, setConvertedOutput] = useState('');

  useEffect(() => {
    async function fetchData() {
      const parsedYaml = await mapDefinitionToJson(input);
      setConvertedOutput(JSON.stringify(parsedYaml, null, '\t'));
    }
    fetchData();
  });

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

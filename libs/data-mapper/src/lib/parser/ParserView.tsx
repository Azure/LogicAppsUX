import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapDefinition } from './jsonToMapDefinitionParser';
import { mapDefinitionToJson } from './mapDefinitionToJsonParser';

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
  const convertedOutput = JSON.stringify(mapDefinitionToJson(input), null, '\t');

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

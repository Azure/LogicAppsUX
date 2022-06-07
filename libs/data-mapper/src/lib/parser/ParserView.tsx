import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapDefinition } from './jsonToMapDefinitionParser';
import { mapDefinitionToJson } from './mapDefinitionToJsonParser';

export interface ParserViewProps {
  input: string;
  inputFormat: ParserInputFormat;
}

export enum ParserInputFormat {
  JSON_FORMAT = 'JsonFormat',
  YAML_FORMAT = 'YamlFormat',
}

export const ParserView = ({ input, inputFormat }: ParserViewProps) => {
  const convertedOutput =
    inputFormat === ParserInputFormat.JSON_FORMAT
      ? jsonToMapDefinition(JSON.parse(input))
      : JSON.stringify(mapDefinitionToJson(input), null, '\t');

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

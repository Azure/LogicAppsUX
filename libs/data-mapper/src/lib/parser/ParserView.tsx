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
  const convertedOutput = JSON.stringify(mapDefinitionToJson(input), null, '\t');

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

export const CompareMapDefinitionParserView = ({ input }: ParserViewProps) => {
  const convertedOutput = JSON.stringify(mapDefinitionToJson(jsonToMapDefinition(JSON.parse(input))), null, '\t');

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

export const CompareJsonParserView = ({ input }: ParserViewProps) => {
  const convertedOutput = jsonToMapDefinition(mapDefinitionToJson(input));

  return (
    <div>
      <SampleDataDisplayer data={input} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};

import { JsonToMapParserView, simpleJsonExample } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <JsonToMapParserView input={JSON.stringify(simpleJsonExample, null, '\t')} />;
  // return <MapToJsonParserView input={simpleMapDefExampleMapDefinitionMock} />;
};

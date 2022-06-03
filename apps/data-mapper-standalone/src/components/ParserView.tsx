import { forWithIndexAndValueJsonMock, JsonToMapParserView } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <JsonToMapParserView input={JSON.stringify(forWithIndexAndValueJsonMock, null, '\t')} />;
  // return <MapToJsonParserView input={simpleMapDefExampleMapDefinitionMock} />; // replaced with this line to see mapcode -> json
};

import {
  forWithIndexAndValueJsonMock,
  cbrInputRecordMapDefinitionMock,
  JsonToMapParserView,
  MapToJsonParserView,
  simpleJsonExample,
} from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <JsonToMapParserView input={JSON.stringify(forWithIndexAndValueJsonMock, null, '\t')} />;
  // return <MapToJsonParserView input={simpleJsonExample} />;
};

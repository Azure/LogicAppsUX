import { customerOrdersJsonMock, JsonToMapParserView } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <JsonToMapParserView input={JSON.stringify(customerOrdersJsonMock, null, '\t')} />;
};

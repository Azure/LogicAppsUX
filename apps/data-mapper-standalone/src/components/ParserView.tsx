import { customerOrdersJsonMock, ParserInputFormat, ParserView } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  const parserInput = JSON.stringify(customerOrdersJsonMock, null, '\t');

  return <ParserView input={parserInput} inputFormat={ParserInputFormat.JSON_FORMAT} />;
};

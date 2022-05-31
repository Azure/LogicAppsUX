import { customerOrdersJsonMock, ParserView } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <ParserView input={JSON.stringify(customerOrdersJsonMock, null, '\t')} />;
};
